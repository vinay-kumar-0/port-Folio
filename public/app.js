const forms = {
  contact: document.querySelector("#contact-form"),
  services: document.querySelector("#services-form"),
  buy: document.querySelector("#buy-form"),
};

const alertNodes = {
  contact: document.querySelector("[data-contact-alert]"),
  services: document.querySelector("[data-services-alert]"),
  buy: document.querySelector("[data-buy-alert]"),
  hire: null,
};

// Hamburger menu toggle
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("nav-menu");

if (hamburger && navMenu) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navMenu.classList.toggle("active");
  });

  // Close menu when clicking on a nav link
  navMenu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      hamburger.classList.remove("active");
      navMenu.classList.remove("active");
    });
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
      hamburger.classList.remove("active");
      navMenu.classList.remove("active");
    }
  });
}

async function postJSON(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

function setAlert(node, message, isError = false) {
  if (!node) return;
  node.textContent = message;
  node.className = `alert${isError ? " error" : ""}`;
}

function bindForm(key, endpoint, mapper) {
  const form = forms[key];
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const alert = alertNodes[key];
    setAlert(alert, "Sending...");
    const formData = new FormData(form);
    const payload = mapper(Object.fromEntries(formData.entries()));
    try {
      await postJSON(endpoint, payload);
      setAlert(alert, "Sent! I'll reply soon.");
      form.reset();
    } catch (err) {
      setAlert(alert, err.message, true);
    }
  });
}

bindForm("contact", "/api/contact", (d) => ({
  name: d.name,
  email: d.email,
  message: d.message,
}));

bindForm("services", "/api/services", (d) => ({
  name: d.name,
  email: d.email,
  service: d.service,
  details: d.details,
}));

bindForm("buy", "/api/buy", (d) => ({
  name: d.name,
  email: d.email,
  quantity: d.quantity,
  note: d.note,
}));

// Hire modal
const hireOpeners = document.querySelectorAll("[data-hire-open]");
let modalBackdrop;

function ensureHireModal() {
  if (modalBackdrop) return modalBackdrop;
  modalBackdrop = document.createElement("div");
  modalBackdrop.className = "modal-backdrop";
  modalBackdrop.innerHTML = `
    <div class="modal">
      <header>
        <h2>Hire Me</h2>
        <button class="close-btn" aria-label="Close">×</button>
      </header>
      <form id="hire-form" class="form-grid" style="margin-top: 1rem;">
        <div>
          <label for="hire-name">Name</label>
          <input id="hire-name" name="name" required placeholder="Your name" />
        </div>
        <div>
          <label for="hire-email">Email</label>
          <input id="hire-email" name="email" type="email" required placeholder="you@example.com" />
        </div>
        <div>
          <label for="hire-role">Role / Need</label>
          <input id="hire-role" name="role" placeholder="e.g. Frontend help" />
        </div>
        <div class="full" style="grid-column: 1 / -1;">
          <label for="hire-details">Details</label>
          <textarea id="hire-details" name="details" placeholder="Timeline, scope, links..."></textarea>
        </div>
        <div class="form-actions" style="grid-column: 1 / -1;">
          <button class="button-primary" type="submit">Submit</button>
          <div class="form-alert" data-hire-alert></div>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modalBackdrop);
  alertNodes.hire = modalBackdrop.querySelector("[data-hire-alert]");
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop || e.target.classList.contains("close-btn")) {
      modalBackdrop.classList.remove("active");
    }
  });
  const form = modalBackdrop.querySelector("#hire-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    setAlert(alertNodes.hire, "Sending...");
    try {
      await postJSON("/api/hire", payload);
      setAlert(alertNodes.hire, "Received! I'll reach back.");
      form.reset();
    } catch (err) {
      setAlert(alertNodes.hire, err.message, true);
    }
  });
  return modalBackdrop;
}

hireOpeners.forEach((btn) => {
  btn.addEventListener("click", () => {
    ensureHireModal().classList.add("active");
  });
});
