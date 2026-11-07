export const shouldConfigureDesktopUpdates = ({ packaged, disabled, updatePolicy }) =>
  packaged && disabled !== "1" && updatePolicy !== "manual";
