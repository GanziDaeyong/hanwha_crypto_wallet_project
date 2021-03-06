// Goto Home page
$("#_home").click(function () {
  GoHome();
});

// Get current account's balance and address
$("#contact").click(function () {
  _SendMsg("dev");
});
// TODO: No Account Created & Go Home stucks
async function GoHome() {
  try {
    const curr = await _GetCurr();
    Loading();

    const address = curr["address"];
    const name = curr["name"];
    CheckTxBuffer();

    _GetBalance_EtherAndTokenTest(address).then((result) => {
      let msg =
        "<br><strong>Current Account:</strong><br>" +
        name +
        "<br><br><strong>Account Address:</strong><br>" +
        address +
        "<br><br><strong>Account Balance:</strong><br>" +
        result;
      UnLoading();

      _SendMsg("_0201", msg);
    });
  } catch (err) {
    // let msg = "Please create or load account first";
    _SendMsg("_0201_2");
    // _SendMsg("_0201", msg);
  }
}
