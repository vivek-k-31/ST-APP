/* =========================================================
   ST PAY - FRONTEND SCRIPT
   Fixed version
   ========================================================= */


/* =========================================================
   API BASE
   ========================================================= */

var API = "";

if (
  location.hostname === "127.0.0.1" ||
  location.hostname === "localhost"
) {
  API = "http://127.0.0.1:5000";
} else {
  API = location.origin;
}

console.log("API BASE:", API);


/* =========================================================
   COMMON HELPERS
   ========================================================= */

function getLoggedUser() {
  return (sessionStorage.getItem("user") || "").trim();
}


function sanitizeAmount(value) {
  if (value === undefined || value === null) {
    return "0.00";
  }

  var txt = String(value).trim();

  if (
    !txt ||
    txt === "undefined" ||
    txt === "null" ||
    txt === "NaN"
  ) {
    return "0.00";
  }

  txt = txt.replace(/[₹,\s]/g, "");

  var num = Number(txt);

  if (isNaN(num)) {
    return "0.00";
  }

  return num.toFixed(2);
}


function amountToNumber(value) {
  var txt = sanitizeAmount(value);
  var num = Number(txt);

  return isNaN(num) ? 0 : num;
}


/* =========================================================
   STORAGE KEYS
   ========================================================= */

function getUserBalanceKey(user) {
  return "stpay_balance_" + String(user || "").toLowerCase();
}


function getAltUserBalanceKey(user) {
  return "balance_" + String(user || "").toLowerCase();
}


function getUserHistoryKey(user) {
  return "stpay_history_" + String(user || "").toLowerCase();
}


function getAltUserHistoryKey(user) {
  return "history_" + String(user || "").toLowerCase();
}


function getUserRechargeHistoryKey(user) {
  return "stpay_recharge_history_" + String(user || "").toLowerCase();
}


function getAltUserRechargeHistoryKey(user) {
  return "recharge_history_" + String(user || "").toLowerCase();
}


/* =========================================================
   BALANCE UPDATE TIME
   ========================================================= */

function markBalanceUpdatedNow() {
  var now = String(Date.now());

  sessionStorage.setItem(
    "stpay_balance_last_updated",
    now
  );

  localStorage.setItem(
    "stpay_balance_last_updated",
    now
  );

  var user = getLoggedUser();

  if (user) {
    localStorage.setItem(
      "stpay_balance_last_updated_" +
        String(user).toLowerCase(),
      now
    );
  }

  return now;
}


function getBalanceUpdatedAt() {
  var user = getLoggedUser();

  return Number(
    sessionStorage.getItem("stpay_balance_last_updated") ||
    (
      user
        ? localStorage.getItem(
            "stpay_balance_last_updated_" +
              String(user).toLowerCase()
          )
        : ""
    ) ||
    localStorage.getItem("stpay_balance_last_updated") ||
    0
  );
}


/* =========================================================
   LOCAL BALANCE
   ========================================================= */

function getRawLocalBalance() {
  var user = getLoggedUser();

  var values = [
    sessionStorage.getItem("balance_amount"),
    sessionStorage.getItem("current_balance"),
    sessionStorage.getItem("wallet_balance"),
    sessionStorage.getItem("walletBalance"),
    sessionStorage.getItem("balance"),

    user
      ? localStorage.getItem(getUserBalanceKey(user))
      : "",

    user
      ? localStorage.getItem(getAltUserBalanceKey(user))
      : "",

    localStorage.getItem("stpay_balance"),
    localStorage.getItem("stpay_wallet_balance"),
    localStorage.getItem("balance"),
    localStorage.getItem("walletBalance")
  ];

  for (var i = 0; i < values.length; i++) {
    if (
      values[i] !== null &&
      values[i] !== undefined &&
      String(values[i]).trim() !== ""
    ) {
      return values[i];
    }
  }

  return "0";
}


function hasStrongLocalBalance() {
  var value = getRawLocalBalance();
  return amountToNumber(value) > 0;
}


function saveBalanceAmount(value) {
  var user = getLoggedUser();
  var finalAmount = sanitizeAmount(value);

  /* session storage */
  sessionStorage.setItem(
    "balance_amount",
    finalAmount
  );

  sessionStorage.setItem(
    "current_balance",
    finalAmount
  );

  sessionStorage.setItem(
    "wallet_balance",
    finalAmount
  );

  sessionStorage.setItem(
    "walletBalance",
    finalAmount
  );

  sessionStorage.setItem(
    "balance",
    finalAmount
  );


  /* local storage */
  localStorage.setItem(
    "stpay_balance",
    finalAmount
  );

  localStorage.setItem(
    "stpay_wallet_balance",
    finalAmount
  );

  localStorage.setItem(
    "balance",
    finalAmount
  );

  localStorage.setItem(
    "walletBalance",
    finalAmount
  );


  /* user-specific storage */
  if (user) {
    localStorage.setItem(
      getUserBalanceKey(user),
      finalAmount
    );

    localStorage.setItem(
      getAltUserBalanceKey(user),
      finalAmount
    );
  }

  markBalanceUpdatedNow();

  return finalAmount;
}


function getSavedBalanceAmount() {
  return sanitizeAmount(
    getRawLocalBalance()
  );
}


/* =========================================================
   BALANCE UI
   ========================================================= */

function updateBalanceElements(value) {
  var finalAmount = saveBalanceAmount(value);

  var ids = [
    "balance",
    "secureBalanceValue",
    "statementBalance",
    "profileBalance",
    "availableBalance",
    "walletBalance",
    "balanceAmount"
  ];

  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);

    if (el) {
      var displayValue = "₹" + finalAmount;

      el.innerText = displayValue;
      el.textContent = displayValue;
    }
  }

  return finalAmount;
}


function setTextIfExists(id, value) {
  var el = document.getElementById(id);

  if (el) {
    el.innerText = value;
    el.textContent = value;
  }
}


/* =========================================================
   SAFE JSON
   ========================================================= */

function safeJson(res) {
  try {
    if (!res) {
      return Promise.resolve({});
    }

    if (res.status === 204) {
      return Promise.resolve({});
    }

    return res.text()
      .then(function (txt) {

        if (!txt || !txt.trim()) {
          return {};
        }

        try {
          return JSON.parse(txt);
        } catch (e) {
          console.log(
            "JSON parse error:",
            e
          );

          return {};
        }
      })
      .catch(function (e) {

        console.log(
          "JSON read error:",
          e
        );

        return {};
      });

  } catch (e) {

    console.log(
      "safeJson error:",
      e
    );

    return Promise.resolve({});
  }
}


/* =========================================================
   ARRAY STORAGE
   ========================================================= */

function readArrayStorage(key) {
  try {
    var raw = localStorage.getItem(key) || "[]";
    var parsed = JSON.parse(raw);

    return Object.prototype.toString.call(
      parsed
    ) === "[object Array]"
      ? parsed
      : [];

  } catch (e) {
    return [];
  }
}


function writeArrayStorage(
  key,
  arr,
  limit
) {
  var list =
    Object.prototype.toString.call(arr) ===
    "[object Array]"
      ? arr
      : [];

  localStorage.setItem(
    key,
    JSON.stringify(
      list.slice(0, limit || 100)
    )
  );
}


/* =========================================================
   BALANCE EVENT
   ========================================================= */

function dispatchBalanceUpdateEvent(value) {
  try {

    window.dispatchEvent(
      new CustomEvent(
        "stpay-balance-updated",
        {
          detail: {
            user: getLoggedUser(),
            balance: sanitizeAmount(value)
          }
        }
      )
    );

  } catch (e) {

    console.log(
      "dispatchBalanceUpdateEvent error:",
      e
    );
  }
}


/* =========================================================
   HISTORY NORMALIZATION
   ========================================================= */

function normalizeHistoryItem(item) {

  var obj = item || {};

  var type =
    String(
      obj.type || ""
    ).toLowerCase();

  return {

    type:
      obj.type ||
      "transaction",

    title:
      obj.title ||
      obj.name ||
      "Transaction",

    subtitle:
      obj.subtitle ||
      obj.to ||
      obj.billName ||
      obj.ticketName ||
      obj.provider ||
      "",

    user:
      obj.user ||
      getLoggedUser(),

    to:
      obj.to || "",

    number:
      obj.number || "",

    provider:
      obj.provider || "",

    billName:
      obj.billName || "",

    ticketName:
      obj.ticketName || "",

    plan:
      obj.plan || "",

    amount:
      amountToNumber(obj.amount),

    sign:
      obj.sign ||
      (
        type === "credit"
          ? "+"
          : "-"
      ),

    color:
      obj.color ||
      (
        type === "credit"
          ? "green"
          : "red"
      ),

    time:
      obj.time ||
      new Date().toLocaleString("en-IN"),

    status:
      obj.status ||
      "success",

    balanceAfter:
      sanitizeAmount(
        obj.balanceAfter ||
        getSavedBalanceAmount()
      ),

    txn:
      obj.txn ||
      obj.txId ||
      obj.txnId ||
      "",

    txnId:
      obj.txnId ||
      obj.txn ||
      "",

    icon:
      obj.icon ||
      "💳",

    method:
      obj.method ||
      "",

    category:
      obj.category ||
      type ||
      "transaction"
  };
}


/* =========================================================
   PUSH HISTORY
   ========================================================= */

function pushUserHistory(item) {

  try {

    var user = getLoggedUser();

    if (!user || !item) {
      return;
    }

    var normalized =
      normalizeHistoryItem(item);


    /* common history */
    var commonHistory =
      readArrayStorage(
        "stpay_history"
      );

    commonHistory.unshift(
      normalized
    );

    writeArrayStorage(
      "stpay_history",
      commonHistory,
      150
    );


    /* legacy common history */
    var commonHistoryAlt =
      readArrayStorage("history");

    commonHistoryAlt.unshift(
      normalized
    );

    writeArrayStorage(
      "history",
      commonHistoryAlt,
      150
    );


    /* user history */
    var userHistoryKey =
      getUserHistoryKey(user);

    var userHistory =
      readArrayStorage(
        userHistoryKey
      );

    userHistory.unshift(
      normalized
    );

    writeArrayStorage(
      userHistoryKey,
      userHistory,
      150
    );


    /* legacy user history */
    var altUserHistoryKey =
      getAltUserHistoryKey(user);

    var altUserHistory =
      readArrayStorage(
        altUserHistoryKey
      );

    altUserHistory.unshift(
      normalized
    );

    writeArrayStorage(
      altUserHistoryKey,
      altUserHistory,
      150
    );


    /* recharge history */
    if (
      String(
        normalized.type
      ).toLowerCase() ===
      "recharge"
    ) {

      var commonRecharge =
        readArrayStorage(
          "stpay_recharge_history"
        );

      commonRecharge.unshift(
        normalized
      );

      writeArrayStorage(
        "stpay_recharge_history",
        commonRecharge,
        100
      );


      var commonRechargeAlt =
        readArrayStorage(
          "recharge_history"
        );

      commonRechargeAlt.unshift(
        normalized
      );

      writeArrayStorage(
        "recharge_history",
        commonRechargeAlt,
        100
      );


      var userRechargeKey =
        getUserRechargeHistoryKey(
          user
        );

      var userRecharge =
        readArrayStorage(
          userRechargeKey
        );

      userRecharge.unshift(
        normalized
      );

      writeArrayStorage(
        userRechargeKey,
        userRecharge,
        100
      );


      var altUserRechargeKey =
        getAltUserRechargeHistoryKey(
          user
        );

      var altUserRecharge =
        readArrayStorage(
          altUserRechargeKey
        );

      altUserRecharge.unshift(
        normalized
      );

      writeArrayStorage(
        altUserRechargeKey,
        altUserRecharge,
        100
      );
    }


    localStorage.setItem(
      "stpay_last_history_update",
      String(Date.now())
    );

  } catch (e) {

    console.log(
      "pushUserHistory error:",
      e
    );
  }
}


/* =========================================================
   BALANCE CALCULATION
   ========================================================= */

function applyBalanceDelta(delta) {

  var current =
    amountToNumber(
      getSavedBalanceAmount()
    );

  var change =
    Number(delta || 0);

  if (isNaN(change)) {
    change = 0;
  }

  var finalAmount =
    current + change;

  if (isNaN(finalAmount)) {
    finalAmount = current;
  }

  if (finalAmount < 0) {
    finalAmount = 0;
  }

  var saved =
    updateBalanceElements(
      finalAmount
    );

  dispatchBalanceUpdateEvent(
    saved
  );

  return saved;
}


function deductBalanceAmount(amount) {

  var amt =
    amountToNumber(amount);

  if (amt <= 0) {
    return getSavedBalanceAmount();
  }

  return applyBalanceDelta(
    -amt
  );
}


function creditBalanceAmount(amount) {

  var amt =
    amountToNumber(amount);

  if (amt <= 0) {
    return getSavedBalanceAmount();
  }

  return applyBalanceDelta(
    amt
  );
}


/* =========================================================
   LOGIN
   ========================================================= */

function requireLogin() {

  var user =
    getLoggedUser();

  if (!user) {

    window.location =
      "index.html";

    return false;
  }

  return true;
}


/* =========================================================
   USER DISPLAY
   ========================================================= */

function initUserDisplay() {

  var user =
    getLoggedUser() ||
    "User";

  setTextIfExists(
    "userPill",
    user
  );

  setTextIfExists(
    "profileUserName",
    user
  );

  setTextIfExists(
    "profileName",
    user
  );

  setTextIfExists(
    "welcomeUser",
    user
  );

  setTextIfExists(
    "displayUser",
    user
  );

  setTextIfExists(
    "userDisplay",
    user
  );

  setTextIfExists(
    "walletUserName",
    user
  );

  setTextIfExists(
    "currentUser",
    user
  );
}


/* =========================================================
   LOAD BALANCE
   ========================================================= */

function loadBalance() {

  return new Promise(function (resolve) {

    try {

      var user =
        getLoggedUser();

      var saved =
        getSavedBalanceAmount();

      var savedNum =
        amountToNumber(saved);

      var hasLocal =
        hasStrongLocalBalance();

      var lastUpdatedAt =
        getBalanceUpdatedAt();

      var isRecentLocalUpdate =
        lastUpdatedAt &&
        (
          Date.now() -
          lastUpdatedAt <
          30 * 60 * 1000
        );


      /* immediately display local balance */
      updateBalanceElements(
        saved
      );


      if (!user) {

        resolve(saved);
        return;
      }


      /*
        IMPORTANT:
        If backend does not have /api/balance route,
        don't destroy local balance.
      */

      fetch(
        API +
        "/api/balance/" +
        encodeURIComponent(user)
      )

        .then(function (res) {

          return Promise.all([
            Promise.resolve(res),
            safeJson(res)
          ]);

        })

        .then(function (arr) {

          var res =
            arr[0];

          var data =
            arr[1];

          console.log(
            "Balance API:",
            res.status,
            data
          );


          /*
             404 = backend route doesn't exist.
             Keep local balance.
          */

          if (res.status === 404) {

            console.warn(
              "Balance API route not found. " +
              "Using local balance."
            );

            updateBalanceElements(
              saved
            );

            resolve(saved);
            return;
          }


          var serverAmount =
            null;


          if (
            res.ok &&
            data &&
            data.balance !== undefined &&
            data.balance !== null &&
            !isNaN(
              Number(data.balance)
            )
          ) {

            serverAmount =
              Number(
                data.balance
              );
          }


          /*
             Server has valid balance.
          */

          if (
            serverAmount !== null
          ) {

            var finalServer =
              sanitizeAmount(
                serverAmount
              );

            updateBalanceElements(
              finalServer
            );

            dispatchBalanceUpdateEvent(
              finalServer
            );

            resolve(
              finalServer
            );

            return;
          }


          /*
             Recent local update should
             not be overwritten by invalid server data.
          */

          if (
            hasLocal &&
            savedNum > 0 &&
            isRecentLocalUpdate
          ) {

            var keepLocal =
              sanitizeAmount(
                saved
              );

            updateBalanceElements(
              keepLocal
            );

            resolve(
              keepLocal
            );

            return;
          }


          /*
             Final fallback.
          */

          updateBalanceElements(
            saved
          );

          resolve(saved);

        })

        .catch(function (e) {

          console.log(
            "Balance load error:",
            e
          );

          updateBalanceElements(
            saved
          );

          resolve(saved);
        });


    } catch (e) {

      console.log(
        "Balance load error:",
        e
      );

      var fallback =
        getSavedBalanceAmount();

      updateBalanceElements(
        fallback
      );

      resolve(
        fallback
      );
    }

  });
}


/* =========================================================
   BALANCE VISIBILITY
   ========================================================= */

function setBalanceVisibility(show) {

  var masked =
    document.getElementById(
      "balanceMasked"
    );

  var real =
    document.getElementById(
      "balanceWrap"
    );

  var btn =
    document.getElementById(
      "balBtn"
    );


  if (!masked || !real || !btn) {
    return;
  }


  if (show) {

    masked.classList.add(
      "hidden"
    );

    real.classList.remove(
      "hidden"
    );

    masked.style.display =
      "none";

    real.style.display =
      "inline";

    btn.innerText =
      "👁 Hide";

    btn.textContent =
      "👁 Hide";

    sessionStorage.setItem(
      "balance_visible",
      "1"
    );

  } else {

    masked.classList.remove(
      "hidden"
    );

    real.classList.add(
      "hidden"
    );

    masked.style.display =
      "inline";

    real.style.display =
      "none";

    btn.innerText =
      "🔒 Show";

    btn.textContent =
      "🔒 Show";

    sessionStorage.setItem(
      "balance_visible",
      "0"
    );
  }
}


function setBalanceVisible(show) {
  setBalanceVisibility(show);
}


function toggleBalanceLock() {

  var visible =
    sessionStorage.getItem(
      "balance_visible"
    ) === "1";


  if (visible) {

    setBalanceVisibility(
      false
    );

    return;
  }


  var pass =
    prompt(
      "Enter password to view balance"
    );


  if (pass === null) {
    return;
  }


  var correctPass =
    (
      sessionStorage.getItem(
        "pass"
      ) ||
      "123"
    ).trim();


  if (
    pass.trim() ===
    correctPass
  ) {

    loadBalance()
      .then(function () {

        setBalanceVisibility(
          true
        );

      });

  } else {

    alert(
      "Wrong password"
    );

    setBalanceVisibility(
      false
    );
  }
}


/* =========================================================
   SECURE BALANCE MODAL
   ========================================================= */

function openBalanceFeature() {

  var modal =
    document.getElementById(
      "balanceModal"
    );

  var input =
    document.getElementById(
      "balancePasswordInput"
    );

  var error =
    document.getElementById(
      "balanceError"
    );

  var box =
    document.getElementById(
      "secureAmountBox"
    );

  var val =
    document.getElementById(
      "secureBalanceValue"
    );


  if (error) {
    error.style.display =
      "none";
  }

  if (box) {
    box.style.display =
      "none";
  }

  if (input) {
    input.value = "";
  }


  if (val) {

    val.innerText =
      "₹" +
      sanitizeAmount(
        getSavedBalanceAmount()
      );

    val.textContent =
      "₹" +
      sanitizeAmount(
        getSavedBalanceAmount()
      );
  }


  if (modal) {

    modal.style.display =
      "flex";

    setTimeout(
      function () {

        if (input) {
          input.focus();
        }

      },
      100
    );
  }
}


function closeBalanceModal() {

  var modal =
    document.getElementById(
      "balanceModal"
    );

  if (modal) {
    modal.style.display =
      "none";
  }
}


function verifyBalancePassword() {

  var inputEl =
    document.getElementById(
      "balancePasswordInput"
    );

  var entered =
    inputEl
      ? String(
          inputEl.value
        ).trim()
      : "";


  var correct =
    String(
      sessionStorage.getItem(
        "pass"
      ) ||
      "123"
    ).trim();


  var error =
    document.getElementById(
      "balanceError"
    );

  var box =
    document.getElementById(
      "secureAmountBox"
    );

  var val =
    document.getElementById(
      "secureBalanceValue"
    );


  if (
    entered !== correct
  ) {

    if (box) {
      box.style.display =
        "none";
    }

    if (error) {
      error.style.display =
        "block";
    }

    return;
  }


  if (error) {
    error.style.display =
      "none";
  }


  loadBalance()
    .then(function (
      latestBalance
    ) {

      if (val) {

        var finalValue =
          "₹" +
          sanitizeAmount(
            latestBalance
          );

        val.innerText =
          finalValue;

        val.textContent =
          finalValue;
      }


      if (box) {
        box.style.display =
          "block";
      }
    });
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function goPage(page) {
  window.location =
    page;
}


function quickPay(name) {

  sessionStorage.setItem(
    "quick_receiver",
    name
  );

  window.location =
    "transaction.html";
}


function back() {

  if (
    window.history.length > 1
  ) {

    window.history.back();

  } else {

    window.location =
      "dashboard.html";
  }
}


function go(page) {
  window.location =
    page;
}


/* =========================================================
   FAQ
   ========================================================= */

function toggle(head) {

  if (!head) {
    return;
  }

  var item =
    head.closest
      ? head.closest(
          ".rowItem"
        )
      : null;

  if (
    item &&
    item.classList
  ) {

    item.classList.toggle(
      "open"
    );
  }
}


function strContains(
  text,
  search
) {

  if (
    typeof text !==
    "string"
  ) {
    text =
      String(text || "");
  }

  return (
    text.indexOf(search) !==
    -1
  );
}


function filterFAQ() {

  var input =
    document.getElementById(
      "q"
    ) ||
    document.getElementById(
      "searchInput"
    );


  var q =
    (
      input &&
      input.value
        ? input.value
        : ""
    )
      .toLowerCase()
      .trim();


  var items =
    document.querySelectorAll(
      ".faq"
    );

  var shown = 0;


  for (
    var i = 0;
    i < items.length;
    i++
  ) {

    var el =
      items[i];

    var text =
      (
        el.getAttribute(
          "data-text"
        ) ||
        ""
      ) +
      " " +
      (
        el.getAttribute(
          "data-search"
        ) ||
        ""
      ) +
      " " +
      (
        el.innerText ||
        el.textContent ||
        ""
      );


    text =
      String(
        text
      ).toLowerCase();


    var show =
      !q ||
      strContains(
        text,
        q
      );


    el.style.display =
      show
        ? "block"
        : "none";


    if (show) {
      shown++;
    }
  }


  var empty =
    document.getElementById(
      "emptyState"
    );


  if (empty) {

    empty.style.display =
      shown
        ? "none"
        : "block";
  }
}


/* =========================================================
   SEARCH
   ========================================================= */

function applySearch() {

  var input =
    document.getElementById(
      "searchBox"
    ) ||
    document.getElementById(
      "searchInput"
    ) ||
    document.getElementById(
      "q"
    );


  if (!input) {
    return;
  }


  var q =
    (
      input.value ||
      ""
    )
      .trim()
      .toLowerCase();


  var features =
    document.querySelectorAll(
      ".feature"
    );


  for (
    var i = 0;
    i < features.length;
    i++
  ) {

    var el =
      features[i];

    var label =
      (
        el.getAttribute(
          "data-label"
        ) ||
        ""
      ).toLowerCase();


    var hide =
      q &&
      !strContains(
        label,
        q
      );


    el.classList.toggle(
      "hidden",
      hide
    );
  }


  var persons =
    document.querySelectorAll(
      ".personItem"
    );


  for (
    var j = 0;
    j < persons.length;
    j++
  ) {

    var person =
      persons[j];

    var name =
      (
        person.getAttribute(
          "data-name"
        ) ||
        ""
      ).toLowerCase();


    var hidePerson =
      q &&
      !strContains(
        name,
        q
      );


    person.classList.toggle(
      "hidden",
      hidePerson
    );
  }


  var historyItems =
    document.querySelectorAll(
      ".historyItem"
    );


  for (
    var k = 0;
    k < historyItems.length;
    k++
  ) {

    var historyEl =
      historyItems[k];

    var text =
      (
        historyEl.innerText ||
        historyEl.textContent ||
        ""
      ).toLowerCase();


    var hideHistory =
      q &&
      !strContains(
        text,
        q
      );


    historyEl.classList.toggle(
      "hidden",
      hideHistory
    );
  }


  if (
    document.querySelector(
      ".faq"
    )
  ) {

    filterFAQ();
  }
}


function clearSearch() {

  var input1 =
    document.getElementById(
      "searchBox"
    );

  var input2 =
    document.getElementById(
      "searchInput"
    );

  var input3 =
    document.getElementById(
      "q"
    );


  if (input1) {
    input1.value = "";
  }

  if (input2) {
    input2.value = "";
  }

  if (input3) {
    input3.value = "";
  }


  applySearch();
  filterFAQ();
}


/* =========================================================
   ADD MONEY
   ========================================================= */

function addMoney(amount) {

  return new Promise(function (
    resolve
  ) {

    try {

      var user =
        getLoggedUser();


      if (!user) {

        alert(
          "Login required"
        );

        resolve(null);
        return;
      }


      var finalAmount =
        Number(amount);


      if (
        isNaN(finalAmount) ||
        finalAmount <= 0
      ) {

        alert(
          "Enter valid amount"
        );

        resolve(null);
        return;
      }


      fetch(
        API +
        "/api/add-money",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              user: user,
              amount:
                finalAmount
            })
        }
      )

        .then(function (res) {

          return Promise.all([
            Promise.resolve(res),
            safeJson(res)
          ]);

        })

        .then(function (arr) {

          var res =
            arr[0];

          var data =
            arr[1];


          console.log(
            "Add money response:",
            data
          );


          if (
            res.ok &&
            data &&
            data.ok !== false
          ) {

            var balanceValue;


            if (
              data.balance !==
                undefined &&
              data.balance !==
                null &&
              !isNaN(
                Number(
                  data.balance
                )
              )
            ) {

              balanceValue =
                updateBalanceElements(
                  data.balance
                );

            } else {

              /*
                 Only ONE credit.
              */

              balanceValue =
                creditBalanceAmount(
                  finalAmount
                );
            }


            dispatchBalanceUpdateEvent(
              balanceValue
            );


            pushUserHistory({

              type:
                "credit",

              title:
                "Money Added",

              user:
                user,

              amount:
                finalAmount,

              time:
                new Date()
                  .toLocaleString(
                    "en-IN"
                  ),

              status:
                "success",

              balanceAfter:
                balanceValue,

              icon:
                "💰"
            });


            alert(
              "Money added successfully"
            );


            resolve(data);

          } else {

            alert(
              (
                data &&
                data.message
              ) ||
              "Add money failed"
            );

            resolve(null);
          }

        })

        .catch(function (e) {

          console.log(
            "Add money error:",
            e
          );

          alert(
            "Server error"
          );

          resolve(null);
        });


    } catch (e) {

      console.log(
        "Add money error:",
        e
      );

      alert(
        "Server error"
      );

      resolve(null);
    }

  });
}


/* =========================================================
   SEND MONEY
   ========================================================= */

function sendMoney(
  toUser,
  amount
) {

  return new Promise(function (
    resolve
  ) {

    try {

      var fromUser =
        getLoggedUser();


      if (!fromUser) {

        alert(
          "Login required"
        );

        resolve(null);
        return;
      }


      var receiver =
        String(
          toUser || ""
        ).trim();


      var finalAmount =
        Number(amount);


      if (!receiver) {

        alert(
          "Receiver required"
        );

        resolve(null);
        return;
      }


      if (
        isNaN(finalAmount) ||
        finalAmount <= 0
      ) {

        alert(
          "Enter valid amount"
        );

        resolve(null);
        return;
      }


      fetch(
        API +
        "/api/send",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              from:
                fromUser,

              to:
                receiver,

              amount:
                finalAmount
            })
        }
      )

        .then(function (res) {

          return Promise.all([
            Promise.resolve(res),
            safeJson(res)
          ]);

        })

        .then(function (arr) {

          var res =
            arr[0];

          var data =
            arr[1];


          console.log(
            "Send money response:",
            data
          );


          if (
            res.ok &&
            data &&
            data.ok !== false
          ) {

            var finalBal;


            if (
              data.balance !==
                undefined &&
              data.balance !==
                null &&
              !isNaN(
                Number(
                  data.balance
                )
              )
            ) {

              finalBal =
                updateBalanceElements(
                  data.balance
                );

            } else {

              /*
                 Only ONE deduction.
              */

              finalBal =
                deductBalanceAmount(
                  finalAmount
                );
            }


            dispatchBalanceUpdateEvent(
              finalBal
            );


            pushUserHistory({

              type:
                "debit",

              title:
                "Money Sent",

              user:
                fromUser,

              to:
                receiver,

              amount:
                finalAmount,

              time:
                new Date()
                  .toLocaleString(
                    "en-IN"
                  ),

              status:
                "success",

              balanceAfter:
                finalBal,

              icon:
                "📤"
            });


            alert(
              "Payment successful"
            );


            resolve(data);

          } else {

            alert(
              (
                data &&
                data.message
              ) ||
              "Payment failed"
            );

            resolve(null);
          }

        })

        .catch(function (e) {

          console.log(
            "Send money error:",
            e
          );

          alert(
            "Server error"
          );

          resolve(null);
        });


    } catch (e) {

      console.log(
        "Send money error:",
        e
      );

      alert(
        "Server error"
      );

      resolve(null);
    }

  });
}


/* =========================================================
   UNIVERSAL PAYMENT HELPERS
   ========================================================= */

function completeDebitPayment(
  amount,
  historyItem
) {

  var finalBal =
    deductBalanceAmount(
      amount
    );


  if (historyItem) {

    var item =
      historyItem;


    if (!item.time) {

      item.time =
        new Date()
          .toLocaleString(
            "en-IN"
          );
    }


    if (!item.status) {

      item.status =
        "success";
    }


    if (
      !item.balanceAfter
    ) {

      item.balanceAfter =
        finalBal;
    }


    pushUserHistory(
      item
    );
  }


  return finalBal;
}


function completeCreditPayment(
  amount,
  historyItem
) {

  var finalBal =
    creditBalanceAmount(
      amount
    );


  if (historyItem) {

    var item =
      historyItem;


    if (!item.time) {

      item.time =
        new Date()
          .toLocaleString(
            "en-IN"
          );
    }


    if (!item.status) {

      item.status =
        "success";
    }


    if (
      !item.balanceAfter
    ) {

      item.balanceAfter =
        finalBal;
    }


    pushUserHistory(
      item
    );
  }


  return finalBal;
}


function completeBillPayment(
  amount,
  billName
) {

  return completeDebitPayment(

    amount,

    {
      type:
        "bill",

      title:
        "Bill Paid",

      user:
        getLoggedUser(),

      amount:
        amountToNumber(
          amount
        ),

      billName:
        billName ||
        "Bill",

      icon:
        "🧾"
    }
  );
}


function completeTicketPayment(
  amount,
  ticketName
) {

  return completeDebitPayment(

    amount,

    {
      type:
        "ticket",

      title:
        "Ticket Booked",

      user:
        getLoggedUser(),

      amount:
        amountToNumber(
          amount
        ),

      ticketName:
        ticketName ||
        "Ticket",

      icon:
        "🎫"
    }
  );
}


function completeRechargePayment(
  amount,
  providerName
) {

  return completeDebitPayment(

    amount,

    {
      type:
        "recharge",

      title:
        "Recharge Done",

      user:
        getLoggedUser(),

      amount:
        amountToNumber(
          amount
        ),

      provider:
        providerName ||
        "Recharge",

      icon:
        "📱"
    }
  );
}


function completeTransactionPayment(
  amount,
  titleText
) {

  return completeDebitPayment(

    amount,

    {
      type:
        "transaction",

      title:
        titleText ||
        "Transaction Paid",

      user:
        getLoggedUser(),

      amount:
        amountToNumber(
          amount
        ),

      icon:
        "💳"
    }
  );
}


function completePeoplePayment(
  amount,
  personName
) {

  return completeDebitPayment(

    amount,

    {
      type:
        "people",

      title:
        "Paid to Contact",

      user:
        getLoggedUser(),

      to:
        personName ||
        "",

      amount:
        amountToNumber(
          amount
        ),

      icon:
        "👤"
    }
  );
}


function completePayPayment(
  amount,
  receiverName
) {

  return completeDebitPayment(

    amount,

    {
      type:
        "pay",

      title:
        "Payment Done",

      user:
        getLoggedUser(),

      to:
        receiverName ||
        "",

      amount:
        amountToNumber(
          amount
        ),

      icon:
        "💸"
    }
  );
}


/* =========================================================
   HISTORY
   ========================================================= */

function loadHistory() {

  return new Promise(function (
    resolve
  ) {

    try {

      var user =
        getLoggedUser();


      if (!user) {

        resolve([]);
        return;
      }


      fetch(
        API +
        "/api/history/" +
        encodeURIComponent(
          user
        )
      )

        .then(function (res) {

          return Promise.all([
            Promise.resolve(res),
            safeJson(res)
          ]);

        })

        .then(function (arr) {

          var res =
            arr[0];

          var data =
            arr[1];


          console.log(
            "History response:",
            data
          );


          var list =
            (
              data &&
              (
                data.history ||
                data.transactions ||
                data.items
              )
            ) || [];


          if (
            res.ok &&
            Object.prototype.toString.call(
              list
            ) ===
            "[object Array]"
          ) {

            writeArrayStorage(
              "stpay_history",
              list,
              150
            );

            writeArrayStorage(
              "history",
              list,
              150
            );

            writeArrayStorage(
              getUserHistoryKey(
                user
              ),
              list,
              150
            );

            writeArrayStorage(
              getAltUserHistoryKey(
                user
              ),
              list,
              150
            );


            resolve(list);
            return;
          }


          resolve(
            getLocalHistory(
              user
            )
          );

        })

        .catch(function (e) {

          console.log(
            "History load error:",
            e
          );

          resolve(
            getLocalHistory(
              user
            )
          );
        });


    } catch (e) {

      console.log(
        "History load error:",
        e
      );

      resolve(
        getLocalHistory(
          getLoggedUser()
        )
      );
    }

  });
}


function getLocalHistory(user) {

  if (!user) {
    return [];
  }


  var userHistory =
    readArrayStorage(
      getUserHistoryKey(
        user
      )
    );


  if (userHistory.length) {
    return userHistory;
  }


  var altUserHistory =
    readArrayStorage(
      getAltUserHistoryKey(
        user
      )
    );


  if (altUserHistory.length) {
    return altUserHistory;
  }


  var common =
    readArrayStorage(
      "stpay_history"
    );


  if (common.length) {
    return common;
  }


  return readArrayStorage(
    "history"
  );
}


/* =========================================================
   FILE UPLOAD
   ========================================================= */

function uploadFile(formData) {

  return new Promise(function (
    resolve
  ) {

    try {

      fetch(
        API +
        "/api/upload",
        {
          method:
            "POST",

          body:
            formData
        }
      )

        .then(function (res) {

          return Promise.all([
            Promise.resolve(res),
            safeJson(res)
          ]);

        })

        .then(function (arr) {

          var res =
            arr[0];

          var data =
            arr[1];


          console.log(
            "Upload response:",
            data
          );


          if (
            res.ok &&
            data &&
            data.ok !== false
          ) {

            alert(
              "File uploaded successfully"
            );

            resolve(data);

          } else {

            alert(
              (
                data &&
                data.message
              ) ||
              "Upload failed"
            );

            resolve(null);
          }

        })

        .catch(function (e) {

          console.log(
            "Upload error:",
            e
          );

          alert(
            "Server error"
          );

          resolve(null);
        });


    } catch (e) {

      console.log(
        "Upload error:",
        e
      );

      alert(
        "Server error"
      );

      resolve(null);
    }

  });
}


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

  sessionStorage.removeItem(
    "quick_receiver"
  );

  sessionStorage.removeItem(
    "balance_visible"
  );

  sessionStorage.clear();

  window.location =
    "index.html";
}


/* =========================================================
   MODAL CLICK
   ========================================================= */

window.addEventListener(
  "click",
  function (e) {

    var modal =
      document.getElementById(
        "balanceModal"
      );


    if (
      modal &&
      e.target === modal
    ) {

      closeBalanceModal();
    }
  }
);


/* =========================================================
   FOCUS
   ========================================================= */

window.addEventListener(
  "focus",
  function () {

    if (
      getLoggedUser()
    ) {

      updateBalanceElements(
        getSavedBalanceAmount()
      );

      /*
        Don't spam the server.
        Only load if needed.
      */
    }
  }
);


/* =========================================================
   PAGE SHOW
   ========================================================= */

window.addEventListener(
  "pageshow",
  function () {

    if (
      getLoggedUser()
    ) {

      updateBalanceElements(
        getSavedBalanceAmount()
      );
    }
  }
);


/* =========================================================
   STORAGE EVENT
   ========================================================= */

window.addEventListener(
  "storage",
  function (e) {

    var user =
      getLoggedUser();


    if (!e) {
      return;
    }


    if (
      e.key ===
        "stpay_balance" ||

      e.key ===
        "stpay_wallet_balance" ||

      e.key ===
        "balance" ||

      e.key ===
        "walletBalance" ||

      e.key ===
        "stpay_history" ||

      e.key ===
        "history" ||

      e.key ===
        "stpay_balance_last_updated" ||

      (
        user &&
        e.key ===
          getUserBalanceKey(
            user
          )
      ) ||

      (
        user &&
        e.key ===
          getAltUserBalanceKey(
            user
          )
      ) ||

      (
        user &&
        e.key ===
          getUserHistoryKey(
            user
          )
      ) ||

      (
        user &&
        e.key ===
          getAltUserHistoryKey(
            user
          )
      )
    ) {

      updateBalanceElements(
        getSavedBalanceAmount()
      );
    }
  }
);


/* =========================================================
   CUSTOM BALANCE EVENT
   ========================================================= */

window.addEventListener(
  "stpay-balance-updated",
  function () {

    updateBalanceElements(
      getSavedBalanceAmount()
    );
  }
);


/* =========================================================
   DOM READY
   ========================================================= */

window.addEventListener(
  "DOMContentLoaded",
  function () {

    initUserDisplay();


    if (
      getLoggedUser()
    ) {

      updateBalanceElements(
        getSavedBalanceAmount()
      );

      /*
         IMPORTANT:
         Don't call /api/balance repeatedly.
         One initial attempt only.
      */

      loadBalance();
    }


    /*
       Balance lock
    */

    if (
      document.getElementById(
        "balanceMasked"
      ) &&
      document.getElementById(
        "balanceWrap"
      ) &&
      document.getElementById(
        "balBtn"
      )
    ) {

      setBalanceVisibility(
        false
      );
    }


    /*
       Quick receiver
    */

    var quickReceiver =
      sessionStorage.getItem(
        "quick_receiver"
      );


    var receiverInput =
      document.getElementById(
        "receiver"
      ) ||
      document.getElementById(
        "toUser"
      ) ||
      document.getElementById(
        "receiverName"
      );


    if (
      quickReceiver &&
      receiverInput &&
      !receiverInput.value
    ) {

      receiverInput.value =
        quickReceiver;
    }


    /*
       FAQ
    */

    if (
      document.querySelector(
        ".faq"
      )
    ) {

      filterFAQ();
    }

  }
);