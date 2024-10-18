const { DefaultApi, Configuration, Region, WebhookEventVerifier } = require('@onfido/api');

const onfido = new DefaultApi(
  new Configuration({
    apiToken: 'api_sandbox.h4dNJtvPDKK.x-JwJK2p2ItBItkRhNVT3yUmNzZ05hvY',
    // apiToken: 'api_sandbox.zM1fzjYlg-a.HnLGdc9PMF_YBKHujOtEg6VAYq3IBr_k',
    region: Region.EU,
  })
);
module.exports = {
  onfido
};
