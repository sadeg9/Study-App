// Step 1: select all buttons and modals
const buttons = document.querySelectorAll("button[data-modal]");
const modals = document.querySelectorAll(".modal");

// Step 2: open modal when button is clicked
buttons.forEach(button => {
  button.onclick = () => {
    const modalId = button.dataset.modal;        // get modal ID from data attribute
    const modal = document.getElementById(modalId);
    modal.style.display = "flex";               // show modal
  };
});

// Step 3: close modal when X is clicked
modals.forEach(modal => {
  const closeBtn = modal.querySelector(".close");
  closeBtn.onclick = () => modal.style.display = "none";

  // also close if clicking outside modal content
  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
});
