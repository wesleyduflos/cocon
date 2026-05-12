import { initializeApp } from "firebase-admin/app";

initializeApp();

export { parseTask } from "./parseTask";
export { parseShoppingItem } from "./parseShoppingItem";
export {
  exchangeGoogleCode,
  syncGoogleCalendar,
  disconnectGoogle,
} from "./googleCalendar";
export { sendTaskReminder, sendNotificationTest } from "./notifications";
export {
  lookupEmail,
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
  listPasskeys,
  deletePasskey,
} from "./passkeys";
export { suggestPreparations } from "./suggestPreparations";
