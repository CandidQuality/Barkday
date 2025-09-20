<script>
// single source of truth (add ?v=2 when you update the file to bust cache)
const LOGO_SRC = "barkday-logo.png?v=1";

window.addEventListener("DOMContentLoaded", () => {
  const h = document.getElementById("logoHeader");
  const s = document.getElementById("logoSplash");
  if (h) h.src = LOGO_SRC;
  if (s) s.src = LOGO_SRC;
});
</script>
