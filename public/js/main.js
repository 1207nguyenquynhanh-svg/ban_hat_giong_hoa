(() => {
  const isCustomer = document.body.dataset.cartAuthenticated === "true";
  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-cart]");
    if (addButton && !isCustomer) {
      event.preventDefault();
      const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const loginUrl = new URL("/login", window.location.origin);
      loginUrl.searchParams.set("message", "Vui lòng đăng nhập tài khoản để tiến hành đặt hàng.");
      loginUrl.searchParams.set("returnTo", returnTo);
      window.location.assign(loginUrl);
    }
  });
  if (!isCustomer) return;

  const cartItems = document.querySelector("[data-cart-items]");
  const cartEmpty = document.querySelector("[data-cart-empty]");
  const checkoutPanel = document.querySelector("[data-cart-checkout]");
  const drawer = document.getElementById("cart-drawer");
  if (!cartItems || !cartEmpty || !checkoutPanel || !drawer) return;

  let cart = [];
  let cartLoadError = null;
  let cartMutation = Promise.resolve();
  const cartReady = loadCart().catch((error) => {
    cartLoadError = error;
    showCartError(error.message);
    return false;
  });

  function safeImageSource(value) {
    return typeof value === "string"
      && (value.startsWith("https://") || (value.startsWith("/") && !value.startsWith("//")))
      ? value
      : "";
  }

  async function loadCart() {
    const response = await fetch("/cart", { headers: { Accept: "application/json" } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Không thể tải giỏ hàng.");
    cart = normalizeItems(result.items);
    renderCart();
    return true;
  }

  function normalizeItems(items) {
    if (!Array.isArray(items)) return [];
    return items.filter((item) =>
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
      image: safeImageSource(item.image),
      quantity: Math.min(Number(item.quantity), 99)
    }));
  }

  async function replaceCart(items) {
    const response = await fetch("/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ items: items.map(({ id, quantity }) => ({ id, quantity })) })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Không thể cập nhật giỏ hàng.");
    cart = normalizeItems(result.items);
    renderCart();
  }

  function enqueueCartChange(change) {
    cartMutation = cartMutation.then(async () => {
      const ready = await cartReady;
      if (!ready || cartLoadError) throw cartLoadError || new Error("Giỏ hàng chưa tải được.");
      await replaceCart(change(cart));
    }).catch((error) => {
      console.error("Không thể cập nhật giỏ hàng:", error);
      showCartError(error.message || "Không thể cập nhật giỏ hàng. Vui lòng thử lại.");
    });
    return cartMutation;
  }

  function formatPrice(price) {
    const amount = Number(price);
    return `${amount.toLocaleString("vi-VN")}đ`;
  }

  function parseAmount(value) {
    if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
    if (typeof value !== "string") return null;
    let normalized = value.trim().replace(/[^\d,.-]/g, "");
    if (!normalized || !/\d/.test(normalized)) return null;

    const comma = normalized.lastIndexOf(",");
    const dot = normalized.lastIndexOf(".");
    const decimalSeparator = comma > dot ? "," : dot > comma ? "." : "";
    if (decimalSeparator) {
      const separatorIndex = normalized.lastIndexOf(decimalSeparator);
      const trailingDigits = normalized.length - separatorIndex - 1;
      if (trailingDigits === 3) {
        normalized = normalized.replace(/[,.]/g, "");
      } else {
        const groupingSeparator = decimalSeparator === "," ? /\./g : /,/g;
        normalized = normalized.replace(groupingSeparator, "");
        if (decimalSeparator === ",") normalized = normalized.replace(",", ".");
      }
    }
    const amount = Number(normalized);
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  }

  function showCartError(message) {
    const cartError = document.querySelector("[data-cart-error]");
    if (cartError) {
      cartError.textContent = message;
      cartError.hidden = !message;
    }
    const errorMessage = document.querySelector("[data-checkout-error]");
    if (errorMessage) errorMessage.textContent = message;
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
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cart.forEach((item) => {
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

  document.addEventListener("click", async (event) => {
    const addButton = event.target.closest("[data-add-cart]");
    if (addButton) {
      await enqueueCartChange((currentCart) => {
        const id = Number(addButton.dataset.id);
        const next = currentCart.map((item) => ({ ...item }));
        const item = next.find((entry) => entry.id === id);
        if (item) {
          if (item.quantity >= 99) throw new Error("Bạn đã đạt số lượng tối đa cho sản phẩm này.");
          item.quantity += 1;
        } else {
          next.push({ id, quantity: 1 });
        }
        return next;
      });
      if (!cartLoadError) openCart();
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
      await enqueueCartChange((currentCart) => {
        const id = Number(actionButton.dataset.id);
        return currentCart.flatMap((item) => {
          if (item.id !== id) return [{ ...item }];
          if (actionButton.dataset.cartAction === "remove") return [];
          const quantity = actionButton.dataset.cartAction === "increase"
            ? Math.min(item.quantity + 1, 99)
            : Math.max(item.quantity - 1, 1);
          return [{ ...item, quantity }];
        });
      });
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
    submitButton.disabled = true;
    showCartError("");
    try {
      await cartMutation;
      const response = await fetch("/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(checkoutForm)))
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401 && typeof result.loginUrl === "string") {
          window.location.assign(result.loginUrl);
          return;
        }
        showCartError(result.error || "Không thể đặt hàng. Vui lòng thử lại.");
        return;
      }

      const orderCode = result.order_code || result.orderCode;
      const totalPrice = parseAmount(result.total_price ?? result.totalPrice);
      if (typeof orderCode !== "string" || !orderCode.trim() || totalPrice === null) {
        throw new Error("Máy chủ đã nhận phản hồi đặt hàng không hợp lệ. Vui lòng tải lại trang và kiểm tra đơn hàng trước khi đặt lại.");
      }

      cart = [];
      renderCart();
      checkoutForm.reset();
      closeCart();
      window.alert(`Đặt hàng thành công!\nMã đơn hàng: ${orderCode}\nTổng cộng: ${formatPrice(totalPrice)}\nFloraSeed sẽ sớm liên hệ với bạn.`);
    } catch (error) {
      console.error("Không thể hoàn tất yêu cầu đặt hàng:", error);
      showCartError(error.message || "Không kết nối được máy chủ. Vui lòng thử lại.");
    } finally {
      submitButton.disabled = false;
    }
  });

  cartReady.then((ready) => {
    if (!ready) showCartError(cartLoadError.message);
  });
})();
