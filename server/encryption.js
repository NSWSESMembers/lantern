if(!process.env.ENCRYPTION_KEY) {
  console.log("Unable to load ENCRYPTION_KEY from env");
}
else {
  OAuthEncryption.loadKey(process.env.ENCRYPTION_KEY);
}

