import { useEffect } from "react";

/**
 * Tiny SEO helper — sets the document title & meta description on the
 * client side when a page mounts (like react-helmet, dependency-free).
 * The server-rendered <head> in index.html carries the primary tags.
 */
const AppHelmet = ({ title, description }) => {
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", description);
    }
  }, [title, description]);

  return null;
};

export default AppHelmet;
