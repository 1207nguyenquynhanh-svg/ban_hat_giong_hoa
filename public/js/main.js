(() => {
  const storageKey = "floraseed-cart";
  const cartItems = document.querySelector("[data-cart-items]");
  const cartEmpty = document.querySelector("[data-cart-empty]");
  const checkoutPanel = document.querySelector("[data-cart-checkout]");
  const drawer = document.getElementById("cart-drawer");
  let cart = readCart();

  function readCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.filter((item) =>
        item
        && Number.isSafeInteger(Number(item.id))
        && Number(item.id) > 0
        && typeof item.name === "string"
        && Number.isSafeInteger(Number(item.price))
        && Number(item.price) >= 0
        && Number.isSafeInteger(Number(item.quantity))
        && Number(item.quantity) > 0
      ).map((item) => ({
        id: Number(item.id),
        name: item.name.slice(0, 120),
        price: Number(item.price),
        image: typeof item.image === "string" && item.image.startsWith("https://") ? item.image : "",
        quantity: Math.min(Number(item.quantity), 99)
      }));
    } catch (error) {
      console.warn("Không thể đọc giỏ hàng đã lưu:", error);
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch (error) {
      console.error("Không thể lưu giỏ hàng trên thiết bị:", error);
      window.alert("Trình duyệt không thể lưu giỏ hàng. Vui lòng kiểm tra dung lượng lưu trữ.");
    }
  }

  function formatPrice(price) {
    return `${Number(price).toLocaleString("vi-VN")}đ`;
  }

  function makeButton(label, className, action, itemId, disabled = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.dataset.cartAction = action;
    button.dataset.id = String(itemId);
    button.disabled = disabled;
    return button;
  }

  function renderCart() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll("[data-cart-count]").forEach((element) => {
      element.textContent = String(count);
    });

    cartItems.replaceChildren();
    let total = 0;
    cart.forEach((item) => {
      total += item.price * item.quantity;
      const row = document.createElement("article");
      row.className = "cart-item";
      if (item.image) {
        const image = document.createElement("img");
        image.src = item.image;
        image.alt = "";
        image.loading = "lazy";
        row.append(image);
      }
      const details = document.createElement("div");
      details.className = "cart-item-details";
      const name = document.createElement("strong");
      name.textContent = item.name;
      const price = document.createElement("span");
      price.className = "cart-item-price";
      price.textContent = formatPrice(item.price);
      const quantity = document.createElement("div");
      quantity.className = "quantity-control";
      quantity.append(
        makeButton("−", "quantity-button", "decrease", item.id, item.quantity <= 1),
        Object.assign(document.createElement("span"), { textContent: String(item.quantity) }),
        makeButton("+", "quantity-button", "increase", item.id, item.quantity >= 99)
      );
      const remove = makeButton("Xóa", "remove-item", "remove", item.id);
      details.append(name, price, quantity);
      row.append(details, remove);
      cartItems.append(row);
    });

    cartEmpty.hidden = count > 0;
    checkoutPanel.hidden = count === 0;
    document.querySelectorAll("[data-cart-total]").forEach((element) => {
      element.textContent = formatPrice(total);
    });
  }

  function openCart() {
    drawer.classList.add("is-open");
    document.body.classList.add("cart-open");
    drawer.setAttribute("aria-hidden", "false");
    drawer.querySelector(".icon-button").focus();
  }

  function closeCart() {
    drawer.classList.remove("is-open");
    document.body.classList.remove("cart-open");
    drawer.setAttribute("aria-hidden", "true");
  }

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-cart]");
    if (addButton) {
      const id = Number(addButton.dataset.id);
      const item = cart.find((entry) => entry.id === id);
      if (item) {
        if (item.quantity >= 99) {
          window.alert("Bạn đã đạt số lượng tối đa cho sản phẩm này.");
          return;
        }
        item.quantity += 1;
      } else {
        cart.push({
          id,
          name: addButton.dataset.name,
          price: Number(addButton.dataset.price),
          image: addButton.dataset.image,
          quantity: 1
        });
      }
      saveCart();
      renderCart();
      openCart();
      return;
    }

    if (event.target.closest("[data-cart-open]")) {
      openCart();
      return;
    }
    if (event.target.closest("[data-cart-close]")) {
      closeCart();
      return;
    }

    const actionButton = event.target.closest("[data-cart-action]");
    if (actionButton) {
      const id = Number(actionButton.dataset.id);
      const item = cart.find((entry) => entry.id === id);
      if (!item) return;
      if (actionButton.dataset.cartAction === "increase" && item.quantity < 99) item.quantity += 1;
      if (actionButton.dataset.cartAction === "decrease" && item.quantity > 1) item.quantity -= 1;
      if (actionButton.dataset.cartAction === "remove") cart = cart.filter((entry) => entry.id !== id);
      saveCart();
      renderCart();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("is-open")) closeCart();
  });

  const checkoutForm = document.getElementById("checkout-form");
  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!checkoutForm.reportValidity()) return;

    const submitButton = checkoutForm.querySelector("button[type='submit']");
    const errorMessage = document.querySelector("[data-checkout-error]");
    submitButton.disabled = true;
    errorMessage.textContent = "";
    try {
      const response = await fetch("/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(new FormData(checkoutForm)),
          items: cart.map(({ id, quantity }) => ({ id, quantity }))
        })
      });
      const result = await response.json();
      if (!response.ok) {
        errorMessage.textContent = result.error || "Không thể đặt hàng. Vui lòng thử lại.";
        return;
      }

      cart = [];
      saveCart();
      renderCart();
      checkoutForm.reset();
      closeCart();
      window.alert(`Đặt hàng thành công!\nMã đơn hàng: ${result.orderCode}\nTổng cộng: ${formatPrice(result.totalPrice)}\nFloraSeed sẽ sớm liên hệ với bạn.`);
    } catch (error) {
      console.error("Không thể gửi yêu cầu đặt hàng:", error);
      errorMessage.textContent = "Không kết nối được máy chủ. Vui lòng thử lại.";
    } finally {
      submitButton.disabled = false;
    }
  });

  renderCart();
})();
