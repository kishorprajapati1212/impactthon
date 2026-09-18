import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Eye, EyeOff, LogIn, Shield, GraduationCap, UserCog, ShieldCheck,
  Loader2, Clock, XCircle, Smartphone,
} from "lucide-react";
import api from "../../utils/api.js";
import { login } from "../../store/authSlice.js";
import AppNavbar from "../../components/UI/AppNavbar.jsx";
import { getDeviceProfile, isFirstLoginHere, rememberDevice } from "../../utils/device.js";

const roles = [
  { key: "student", icon: GraduationCap, label: "Student", activeBg: "bg-cyan-500/10", activeBorder: "border-cyan-500/50", activeText: "text-cyan-400" },
  { key: "faculty", icon: UserCog, label: "Faculty", activeBg: "bg-blue-500/10", activeBorder: "border-blue-500/50", activeText: "text-blue-400" },
  { key: "admin", icon: Shield, label: "Admin", activeBg: "bg-purple-500/10", activeBorder: "border-purple-500/50", activeText: "text-purple-400" },
];

const Login = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm();
  const [activeRole, setActiveRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const [interrupt, setInterrupt] = useState(null);
  const [sentForApproval, setSentForApproval] = useState(false);
  const [pendingLoginId, setPendingLoginId] = useState(null);
  const [pendingMentor, setPendingMentor] = useState(null);
  const pollRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const emailValue = watch("email");

  // Show any interrupt reason (e.g. device mismatch / logout) on arrival
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("attendx_interrupt");
      if (raw) {
        setInterrupt(JSON.parse(raw));
        sessionStorage.removeItem("attendx_interrupt");
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Stop any pending polling when unmounting (role switch / navigation)
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const currentRole = roles.find((r) => r.key === activeRole) || roles[0];

  const finishLogin = (payload) => {
    dispatch(login({ token: payload.token, user: { ...payload } }));
    toast.success("Welcome, " + (payload.name || "User") + "!");
    navigate("/" + activeRole);
  };

  const pollApproval = (loginId) => {
    setPendingLoginId(loginId);
    setSentForApproval(true);
    if (emailValue) {
      try {
        sessionStorage.setItem("attendx_pending_login:" + emailValue.toLowerCase(), loginId);
      } catch {
        /* ignore */
      }
    }
    let calledOnce = false;
    const tick = async () => {
      try {
        const r = await api.post("/student/approval/status", { loginId });
        const data = r.data;
        if (data.approved && data.data?.token) {
          clearInterval(pollRef.current);
          finishLogin(data.data);
        } else if (data.rejected) {
          clearInterval(pollRef.current);
          setSentForApproval(false);
          if (emailValue) {
            try {
              sessionStorage.removeItem("attendx_pending_login:" + emailValue.toLowerCase());
            } catch { /* ignore */ }
          }
          setServerError("Your mentor rejected this login. Please contact them.");
          toast.error("Login rejected by mentor");
        }
      } catch {
        /* keep waiting on transient errors */
      }
      if (!calledOnce) calledOnce = true;
    };
    tick();
    pollRef.current = setInterval(tick, 4000);
  };

  const onSubmit = async (data) => {
    setServerError("");
    setInterrupt(null);

    const isStudent = activeRole === "student";
    let body = { email: data.email, password: data.password };

    if (isStudent) {
      // ── Device fingerprint (one-time login security) ────────────────
      let profile;
      try {
        profile = await getDeviceProfile();
      } catch {
        profile = { deviceId: null, attestation: null, meta: {} };
      }
      if (!profile.deviceId) {
        let did = null;
        try {
          did = localStorage.getItem("attendx_device_id");
        } catch {
          /* ignore */
        }
        if (!did) {
          did =
            "d_" +
            Date.now().toString(36) +
            Math.random().toString(36).slice(2, 14);
          try {
            localStorage.setItem("attendx_device_id", did);
          } catch {
            /* ignore */
          }
        }
        profile.deviceId = did;
      }
      body.deviceId = profile.deviceId;
      body.attestation = profile.attestation || null;
      body.meta = profile.meta || {};
      body.meta.deviceLabel = profile.deviceLabel || null;

      // Reconnect to an in-flight approval for this account (if any)
      try {
        const prev = sessionStorage.getItem(
          "attendx_pending_login:" + String(data.email || "").toLowerCase()
        );
        if (prev) body.loginId = prev;
      } catch {
        /* ignore */
      }
    }

    try {
      const response = await api.post("/" + activeRole + "/login", body);
      const payload = response.data?.data || response.data;

      if (response.status === 202 || response.data?.code === "AUTH_APPROVAL_PENDING") {
        // Mentor must accept this device login
        setPendingMentor(payload?.mentor || null);
        rememberDevice(data.email);
        toast.info("Login request sent to your mentor");
        pollApproval(payload.loginId);
        return;
      }

      if (isStudent) rememberDevice(data.email);
      finishLogin(payload);
    } catch (err) {
      const code = err.response?.data?.code;
      // Reconnecting to a still-pending approval → resume the waiting screen
      if (code === "AUTH_APPROVAL_PENDING" && err.response?.data?.data?.loginId) {
        const loginId = err.response.data.data.loginId;
        rememberDevice(data.email);
        toast.info("Login still waiting for your mentor's approval");
        pollApproval(loginId);
        return;
      }
      const message =
        err.response?.data?.message ||
        "Login failed. Please check your credentials.";
      setServerError(message);
      toast.error(message);
    }
  };

  // ── Waiting-for-mentor screen ───────────────────────────────────────
  if (sentForApproval && pendingLoginId) {
    return (
      <div className="min-h-screen bg-white dark:bg-dark-900 flex flex-col relative overflow-hidden transition-colors">
        <AppNavbar />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="flex-1 flex items-center justify-center p-4 relative z-10">
          <div className="glass-card p-8 w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={30} className="text-amber-500" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 mb-2">
              Waiting for mentor approval
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Your login on this device has been sent to your mentor.
              {pendingMentor?.name
                ? ` ${pendingMentor.name} (${pendingMentor.employeeId || ""})`
                : ""}
              {" "} will accept it, and this screen will unlock automatically.
            </p>

            <div className="flex items-center justify-center gap-2 my-6 text-amber-500">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-medium">Checking with mentor…</span>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 text-left text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
              <p className="flex items-center gap-2">
                <Smartphone size={13} className="text-cyan-500 shrink-0" />
                This device is now registered as yours. You can only login from
                here.
              </p>
              <p className="flex items-center gap-2">
                <Clock size={13} className="text-cyan-500 shrink-0" />
                If your mentor is not available, ask them later — the approval
                stays open.
              </p>
            </div>

            <button
              onClick={() => {
                if (pollRef.current) clearInterval(pollRef.current);
                setSentForApproval(false);
                setPendingLoginId(null);
              }}
              className="btn-secondary w-full mt-6 flex items-center justify-center gap-2"
            >
              <LogIn size={16} /> Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-dark-900 flex flex-col relative overflow-hidden transition-colors">
      <AppNavbar />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 dark:bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="flex-1 flex items-center justify-center p-4 pt-24 relative z-10">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-black tracking-tight mb-2 text-slate-900 dark:text-slate-50">
                Attend<span className="text-cyan-400">X</span>
              </h1>
              <p className="text-slate-400">Smart Attendance Management</p>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Select Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map(({ key, icon: Icon, label, activeBg, activeBorder, activeText }) => {
                  const isActive = activeRole === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setActiveRole(key);
                        setServerError("");
                        setInterrupt(null);
                        setSentForApproval(false);
                      }}
                      className={
                        "flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200 " +
                        (isActive
                          ? activeBg + " " + activeBorder + " " + activeText
                          : "border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/40 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600")
                      }
                    >
                      <Icon size={20} />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {interrupt && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-4 flex items-start gap-2">
                {interrupt.code === "AUTH_DEVICE_MISMATCH" ? (
                  <XCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                ) : interrupt.code === "AUTH_APPROVAL_PENDING" ? (
                  <Clock size={16} className="text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <Smartphone size={16} className="text-amber-500 shrink-0 mt-0.5" />
                )}
                <p className="text-amber-600 dark:text-amber-400 text-xs leading-relaxed">
                  {interrupt.message}
                </p>
              </div>
            )}

            {activeRole === "student" && (
              <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 mb-4 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck size={16} className="text-cyan-500 shrink-0 mt-0.5" />
                <span>
                  Student login is <b>one-time + device-bound</b>: every login
                  (including after logout) needs your mentor's acceptance, and
                  the session only works on the device used to login.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {serverError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <p className="text-rose-400 text-sm text-center">{serverError}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Email
                </label>
                <input
                  type="email"
                  {...register("email", { required: "Email is required" })}
                  className="input-field"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-rose-400 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password", { required: "Password is required" })}
                    className="input-field pr-12"
                    placeholder="********"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-rose-400 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} /> Sign In as {currentRole.label}
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-slate-400 text-xs mt-6">
              Demo password: <span className="font-mono text-slate-500">pass123</span>
              {" · "}
              <Link to="/" className="text-cyan-400 hover:underline">
                Back to home
              </Link>
            </p>
          </div>

          {activeRole === "student" && emailValue && (
            <div className="glass-card mt-4 p-4 flex items-start gap-3 text-xs text-slate-500 dark:text-slate-400">
              <Smartphone size={16} className="text-cyan-500 shrink-0 mt-0.5" />
              <span>
                {isFirstLoginHere(emailValue)
                  ? "First time on this device — your mentor will approve before you can use the app."
                  : "This device is known, but after every logout your mentor must re-approve your login."}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
