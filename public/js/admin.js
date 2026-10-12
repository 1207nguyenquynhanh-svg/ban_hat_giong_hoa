(() => {
  const backdrop = document.querySelector("[data-feedback-backdrop]");
  if (!backdrop) return;

  const closeButton = backdrop.querySelector("[data-feedback-close]");
  document.body.classList.add("has-admin-feedback");
  closeButton.focus();

  function closeFeedback() {
    backdrop.remove();
    document.body.classList.remove("has-admin-feedback");
    document.removeEventListener("keydown", handleKeydown);
  }

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop || event.target.closest("[data-feedback-close]")) {
      closeFeedback();
    }
  });

  function handleKeydown(event) {
    if (event.key !== "Escape") return;
    closeFeedback();
  }
  document.addEventListener("keydown", handleKeydown);
})();
