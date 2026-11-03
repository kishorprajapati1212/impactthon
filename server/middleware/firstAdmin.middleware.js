import asyncHandler from "../utils/asyncHandler.js";
import Admin from "../models/users/Admin.js";
import protect from "./auth.middleware.js";
import authorizeRoles from "./role.middleware.js";

/**
 * POST /admin/create used to be open to the internet — anyone could make
 * themselves an admin from the public "Create account" page.
 *
 * Rule now: the very first admin can be created without logging in
 * (fresh install, nothing seeded); after that only a logged-in ADMIN may
 * create another admin.
 */
export const adminCreateGuard = asyncHandler(async (req, res, next) => {
  const admins = await Admin.countDocuments();
  if (admins === 0) return next(); // first-run bootstrap
  return protect(req, res, (err) => {
    if (err) return next(err);
    return authorizeRoles("ADMIN")(req, res, next);
  });
});

export default adminCreateGuard;
