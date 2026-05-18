/**
 * Cashfree React Native SDK wrapper.
 * Wraps the callback-based SDK into a Promise-based API (matching old RazorpayCheckout.open() pattern).
 *
 * SDK: react-native-cashfree-pg-sdk
 * Contract: cashfree-pg-api-contract (CFSession, CFDropCheckoutPayment, CFEnvironment)
 *
 * doPayment() expects a CFDropCheckoutPayment wrapping a CFSession — NOT a plain object or JSON string.
 * The SDK internally sets .version on the object then JSON.stringifies it before passing to native.
 */

let _resolve = null;
let _reject = null;
let _callbackRegistered = false;

function getCashfreeSDK() {
  try {
    return require("react-native-cashfree-pg-sdk");
  } catch {
    return null;
  }
}

function getCashfreeContract() {
  try {
    return require("cashfree-pg-api-contract");
  } catch {
    return null;
  }
}

function ensureCallbackRegistered() {
  if (_callbackRegistered) return;
  const sdk = getCashfreeSDK();
  if (!sdk?.CFPaymentGatewayService) return;

  sdk.CFPaymentGatewayService.setCallback({
    onVerify: (orderID) => {
      console.log("[Cashfree] onVerify orderID:", orderID);
      if (_resolve) _resolve({ cf_order_id: orderID });
      _resolve = null;
      _reject = null;
    },
    onError: (error, orderID) => {
      // CFErrorResponse has .getMessage() / .getType() methods, not plain .message
      let msg;
      if (typeof error === "string") {
        msg = error;
      } else if (error && typeof error.getMessage === "function") {
        msg = error.getMessage() || error.getType?.() || "Payment was not completed";
      } else if (error && typeof error === "object") {
        let rawStr = "";
        try { rawStr = JSON.stringify(error); } catch { rawStr = String(error); }
        msg = error.message || error.type || error.status || rawStr || "Payment was not completed";
      } else {
        msg = "Payment was not completed";
      }
      console.log("[Cashfree] onError | msg:", msg, "| orderID:", orderID);
      const err = Object.assign(new Error(msg), { orderID, code: "PAYMENT_CANCELLED" });
      if (_reject) _reject(err);
      _resolve = null;
      _reject = null;
    },
  });
  _callbackRegistered = true;
}

/**
 * Open Cashfree drop checkout.
 *
 * @param {Object} opts
 * @param {string} opts.paymentSessionId - From backend create-order response
 * @param {string} opts.orderId          - cf_order_id from backend
 * @param {string} opts.cfMode           - "sandbox" or "production"
 * @returns {Promise<{cf_order_id: string}>} Resolves on payment success
 * @throws {{ error, orderID, code }} On payment failure/cancellation
 */
export async function openCashfreeCheckout({ paymentSessionId, orderId, cfMode }) {
  const sdk = getCashfreeSDK();
  if (!sdk?.CFPaymentGatewayService) {
    throw new Error("Payment module not ready. Please restart the app.");
  }

  const contract = getCashfreeContract();
  if (!contract?.CFSession || !contract?.CFDropCheckoutPayment || !contract?.CFEnvironment) {
    throw new Error("Cashfree contract module not found. Please rebuild the app.");
  }

  try {
    ensureCallbackRegistered();
  } catch (linkErr) {
    console.log("[Cashfree] Native module not linked:", linkErr?.message);
    throw new Error("Payment module not linked. Please rebuild the app (expo run:android).");
  }

  return new Promise((resolve, reject) => {
    _resolve = resolve;
    _reject = reject;

    try {
      const { CFSession, CFDropCheckoutPayment, CFEnvironment } = contract;

      // CFSession constructor calls .trim() on args — coerce to string to avoid TypeError
      const cfSession = new CFSession(
        String(paymentSessionId),
        String(orderId),
        cfMode === "production" ? CFEnvironment.PRODUCTION : CFEnvironment.SANDBOX
      );

      // CFDropCheckoutPayment wraps the session with all payment modes + default theme
      // doPayment() sets .version internally then JSON.stringifies for native layer
      const cfPayment = new CFDropCheckoutPayment(cfSession, null, null);

      console.log("[Cashfree] doPayment session:", paymentSessionId, "| env:", cfSession.environment);
      sdk.CFPaymentGatewayService.doPayment(cfPayment);
    } catch (err) {
      console.log("[Cashfree] doPayment error:", err?.message);
      const isLinkingError = err?.message?.includes("linked") || err?.message?.includes("native");
      const msg = isLinkingError
        ? "Payment module not linked. Please rebuild the app."
        : (err?.message || "Failed to open payment");
      _resolve = null;
      _reject = null;
      reject(Object.assign(new Error(msg), { code: "SDK_ERROR" }));
    }
  });
}
