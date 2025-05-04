let loggedInUser = "";
let userOrders = [];

async function login() {
  const login = document.getElementById("login").value;
  const password = document.getElementById("password").value;

  const loginBtn = document.querySelector('#login-section button');
  loginBtn.innerHTML = '<span class="loader"></span> Logowanie...';
  loginBtn.disabled = true;

  try {
    const res = await fetch("https://catering-1.onrender.com/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: login, password: password })
    });

    if (res.ok) {
      const data = await res.json();
      loggedInUser = data.username;
      
      document.getElementById("login-section").classList.add('animate__animated', 'animate__fadeOut');
      
      setTimeout(() => {
        document.getElementById("login-section").style.display = "none";
        
        document.getElementById("user-name").textContent = loggedInUser;
        document.getElementById("user-id").textContent = data.user_code || 'Brak kodu';
        
        document.getElementById("user-panel").style.display = "block";
        document.getElementById("user-panel").classList.add('animate__animated', 'animate__fadeInUp');
        
        document.querySelector(".logout-btn").style.display = "flex";
        document.querySelector(".logout-btn").classList.add('animate__animated', 'animate__fadeIn');
        
        loadMenu();
        loadOrderHistory();
      }, 500);
    } else {
      throw new Error("Błędny login lub hasło");
    }
  } catch (error) {
    document.getElementById("login-section").classList.add('animate__animated', 'animate__shakeX');
    setTimeout(() => {
      document.getElementById("login-section").classList.remove('animate__animated', 'animate__shakeX');
    }, 1000);
    
    alert(error.message);
  } finally {
    loginBtn.innerHTML = 'Zaloguj';
    loginBtn.disabled = false;
  }
}

async function loadOrderHistory() {
  try {
    const res = await fetch(`https://catering-1.onrender.com/order/history?username=${loggedInUser}`);
    userOrders = await res.json();
    updateOrderSummary();
  } catch (error) {
    console.error("Błąd ładowania historii:", error);
  }
}

function updateOrderSummary() {
  const summaryElement = document.getElementById("order-summary");
  const deductionInfo = document.getElementById("deduction-info");
  let total = 0;
  
  userOrders.forEach(order => {
    order.meals.forEach(meal => {
      total += parseFloat(meal.price);
    });
  });
  
  summaryElement.classList.add('animate__animated', 'animate__pulse');
  setTimeout(() => {
    summaryElement.classList.remove('animate__animated', 'animate__pulse');
  }, 1000);
  
  summaryElement.textContent = `Suma zamówień: ${total.toFixed(2)} zł`;
  
  if (total > 50) {
    const difference = total - 50;
    deductionInfo.textContent = `Przekroczenie dofinansowania o: ${difference.toFixed(2)} zł`;
    deductionInfo.style.display = "block";
    deductionInfo.classList.add('animate__animated', 'animate__pulse');
  } else {
    deductionInfo.style.display = "none";
    deductionInfo.classList.remove('animate__animated', 'animate__pulse');
  }
}

async function loadMenu() {
  try {
    const res = await fetch("https://catering-1.onrender.com/menu/list");
    const menuItems = await res.json();

    const days = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek"];
    const container = document.getElementById("menu-container");
    container.innerHTML = "";

    days.forEach((day, index) => {
      const groupDiv = document.createElement("div");
      groupDiv.classList.add('menu-group', 'animate__animated', 'animate__fadeIn');
      groupDiv.style.animationDelay = `${index * 0.1}s`;

      const label = document.createElement("label");
      label.textContent = `${day}:`;

      const select = document.createElement("select");
      select.name = day;
      select.classList.add('ripple');

      const defaultOption = document.createElement("option");
      defaultOption.text = "Wybierz danie";
      defaultOption.value = "";
      select.appendChild(defaultOption);

      menuItems.forEach(item => {
        const option = document.createElement("option");
        option.value = JSON.stringify({ name: item.name, price: item.price });
        option.text = `${item.name} (${item.price.toFixed(2)} zł)`;
        select.appendChild(option);
      });

      groupDiv.appendChild(label);
      groupDiv.appendChild(select);
      container.appendChild(groupDiv);
    });
  } catch (error) {
    console.error("Błąd ładowania menu:", error);
  }
}

async function submitOrder() {
  const week = document.getElementById("order-week").value;
  const deliveryLocation = document.getElementById("delivery-location").value;
  const selects = document.querySelectorAll("#menu-container select");

  if (!week) {
    showError("Proszę wybrać tydzień zamówienia!");
    return;
  }
  
  if (!deliveryLocation) {
    showError("Proszę wybrać miejsce dostawy!");
    return;
  }

  const meals = {};
  let hasMeals = false;

  selects.forEach(select => {
    if (select.value) {
      const { name, price } = JSON.parse(select.value);
      meals[select.name] = [{ name, price }];
      hasMeals = true;
    }
  });

  if (!hasMeals) {
    showError("Proszę wybrać przynajmniej jedno danie!");
    return;
  }

  const payload = {
    username: loggedInUser,
    week: week,
    date_range: deliveryLocation,
    meals: meals
  };

  const submitBtn = document.querySelector('#user-panel button[onclick="submitOrder()"]');
  submitBtn.innerHTML = '<span class="loader"></span> Przetwarzanie...';
  submitBtn.disabled = true;

  try {
    const response = await fetch("https://catering-1.onrender.com/order/weekly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      showSuccess("Zamówienie złożone pomyślnie!");
      loadOrderHistory();
      
      document.getElementById('order-week').value = '';
      document.getElementById('delivery-location').value = '';
      selects.forEach(select => {
        select.value = '';
        select.classList.add('animate__animated', 'animate__flash');
        setTimeout(() => {
          select.classList.remove('animate__animated', 'animate__flash');
        }, 1000);
      });
    } else {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Nie udało się złożyć zamówienia");
    }
  } catch (error) {
    showError(error.message);
  } finally {
    submitBtn.innerHTML = 'Złóż zamówienie';
    submitBtn.disabled = false;
  }
}

let isHistoryVisible = false;

async function toggleHistory() {
  const button = document.getElementById("toggle-history");
  const container = document.getElementById("order-history");

  button.innerHTML = '<span class="loader"></span> Ładowanie...';
  button.disabled = true;

  try {
    if (!isHistoryVisible) {
      const res = await fetch(`https://catering-1.onrender.com/order/history?username=${loggedInUser}`);
      userOrders = await res.json();
      updateOrderSummary();

      container.innerHTML = "";
      container.classList.add('animate__animated', 'animate__fadeIn');
      
      userOrders.forEach((order, index) => {
        const div = document.createElement("div");
        div.classList.add('order-item', 'animate__animated', 'animate__fadeIn');
        div.style.animationDelay = `${index * 0.1}s`;
        div.innerHTML = `
          <div class="order-header">
            <strong>Tydzień:</strong> ${order.week} (${order.date_range})
          </div>
          <div class="order-meals">
            <strong>Pozycje:</strong>
            <ul>
              ${order.meals.map(meal => `<li>${meal.day}: ${meal.name} (${meal.price} zł)</li>`).join("")}
            </ul>
          </div>
          <hr>
        `;
        container.appendChild(div);
      });

      button.textContent = "Zakryj historię";
      isHistoryVisible = true;
    } else {
      container.classList.add('animate__animated', 'animate__fadeOut');
      setTimeout(() => {
        container.innerHTML = "";
        container.classList.remove('animate__animated', 'animate__fadeOut');
      }, 500);
      button.textContent = "Pokaż historię";
      isHistoryVisible = false;
    }
  } catch (error) {
    console.error("Błąd ładowania historii:", error);
    showError("Nie udało się załadować historii zamówień");
  } finally {
    button.disabled = false;
    button.innerHTML = isHistoryVisible ? "Zakryj historię" : "Pokaż historię";
  }
}

function logout() {
  document.getElementById("user-panel").classList.add('animate__animated', 'animate__fadeOut');
  document.querySelector(".logout-btn").classList.add('animate__animated', 'animate__fadeOut');
  
  setTimeout(() => {
    loggedInUser = "";
    isHistoryVisible = false;
    userOrders = [];
    
    document.getElementById("login-section").style.display = "block";
    document.getElementById("login-section").classList.add('animate__animated', 'animate__fadeIn');
    document.getElementById("user-panel").style.display = "none";
    document.getElementById("user-panel").classList.remove('animate__animated', 'animate__fadeOut');
    document.querySelector(".logout-btn").style.display = "none";
    
    document.getElementById("login").value = "";
    document.getElementById("password").value = "";
    
    document.getElementById("user-name").textContent = "";
    document.getElementById("menu-container").innerHTML = "";
    document.getElementById("order-history").innerHTML = "";
    document.getElementById("order-summary").textContent = "Suma zamówień: 0.00 zł";
    document.getElementById("deduction-info").style.display = "none";
    
    fetch("https://catering-1.onrender.com/logout", {
      method: "POST",
      credentials: 'include'
    }).catch(error => console.log("Błąd wylogowania:", error));
  }, 500);
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message animate__animated animate__fadeIn';
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--danger);
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  
  errorDiv.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
    ${message}
  `;
  
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.classList.add('animate__fadeOut');
    setTimeout(() => errorDiv.remove(), 500);
  }, 3000);
}

function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message animate__animated animate__fadeIn';
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--success);
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  
  successDiv.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    ${message}
  `;
  
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    successDiv.classList.add('animate__fadeOut');
    setTimeout(() => successDiv.remove(), 500);
  }, 3000);
}

const style = document.createElement('style');
style.textContent = `
  .loader {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
    vertical-align: middle;
    margin-right: 8px;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);