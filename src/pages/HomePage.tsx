import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useKeylessAccounts } from "../core/useKeylessAccounts";
import GoogleLogo from "../components/GoogleLogo";
import { collapseAddress } from "../core/utils";
import {
  Account,
  Aptos,
  AptosConfig,
  Ed25519Account,
  Network,
  RawTransactionWithData,
  SimpleTransaction,
  ViewRequest,
} from "@aptos-labs/ts-sdk";
import { Button, Col, Layout, message, Row } from "antd";

function HomePage() {
  const navigate = useNavigate();
  const aptosConfig = new AptosConfig({ network: Network.DEVNET });
  const aptos = new Aptos(aptosConfig);

  const { activeAccount, disconnectKeylessAccount } = useKeylessAccounts();
  const [agentAccount, setAgnetAccount] = useState<Ed25519Account | null>(null);
  const [accountHasList, setAccountHasList] = useState(false);
  const [payable_level, setPayableLevel] = useState(0);
  const [onchain_payable_level, setOnchainPayableLevel] = useState(0);
  const [counter, setCounter] = useState(0);

  const moduleAddress =
    "0xc3257382628bd3ac1c10acb4d7c7b5896aa84350e24bcab89e8443445faa0f5b";

  const copyToClipboard = async () => {
    if (!activeAccount) {
      return;
    }
    const text = activeAccount.accountAddress.toString();
    if ("clipboard" in navigator) {
      try {
        await navigator.clipboard.writeText(text);
        message.success("success");
      } catch (err) {}
    } else {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
        message.success("success");
      } catch (err) {}
      document.body.removeChild(textarea);
    }
  };

  useEffect(() => {
    if (!activeAccount) navigate("/");
    aptos.fundAccount({
      accountAddress: activeAccount!.accountAddress,
      amount: 100_000_000,
    });
  }, [activeAccount, navigate]);

  async function create_agent() {
    const account = Account.generate();
    await aptos.fundAccount({
      accountAddress: account.accountAddress,
      amount: 100_000_000,
    });

    // 创建一个 Blob 对象，指定内容类型为纯文本
    const blob = new Blob([account.privateKey.toString()], {
      type: "text/plain",
    });

    // 创建一个指向该 Blob 的URL
    const fileURL = URL.createObjectURL(blob);

    // 创建一个临时的a标签用于下载
    const tempLink = document.createElement("a");
    tempLink.href = fileURL;
    tempLink.setAttribute("download", "private_key.txt");
    tempLink.click();

    // 释放创建的URL对象，以避免内存泄漏
    URL.revokeObjectURL(fileURL);

    setAgnetAccount(account);
  }

  const fetchList = async () => {
    if (!activeAccount) {
      message.error("No Activate Account");
      return [];
    }
    console.log("yes");
    try {
      const contractsResource = await aptos.getAccountResource({
        accountAddress: activeAccount.accountAddress,
        resourceType: `${moduleAddress}::contract_v3::ContractList`,
      });
      console.log("resource: ", contractsResource);
      setAccountHasList(true);
      message.success("success");
      const [val] = await aptos.view({
        payload: {
          function: `${moduleAddress}::contract_v3::get_payable_level`,
          functionArguments: [activeAccount.accountAddress.toString(), "1"],
        },
      });
      setOnchainPayableLevel(val as number);
    } catch (e: any) {
      message.error(e);
      setAccountHasList(false);
      console.log("no");
    }
  };

  const addNewList = async () => {
    if (!activeAccount) {
      message.error("No Activate Account");
      return [];
    }
    const transaction: SimpleTransaction = await aptos.transaction.build.simple(
      {
        sender: activeAccount.accountAddress,
        data: {
          function: `${moduleAddress}::contract_v3::create_list`,
          functionArguments: [],
        },
      }
    );
    try {
      // sign and submit transaction to chain
      const response = await aptos.signAndSubmitTransaction({
        signer: activeAccount,
        transaction: transaction,
      });
      // wait for transaction
      await aptos.waitForTransaction({ transactionHash: response.hash });
    } catch (error: any) {
      message.error(error);
      setAccountHasList(false);
      return;
    }

    const transaction2: SimpleTransaction =
      await aptos.transaction.build.simple({
        sender: activeAccount!.accountAddress,
        data: {
          function: `${moduleAddress}::contract_v3::create_contract`,
          functionArguments: [agentAccount?.accountAddress, payable_level],
        },
      });
    try {
      // sign and submit transaction to chain
      const response = await aptos.signAndSubmitTransaction({
        signer: activeAccount!,
        transaction: transaction2,
      });
      // wait for transaction
      await aptos.waitForTransaction({ transactionHash: response.hash });
      setAccountHasList(true);
      message.success("success");
    } catch (error: any) {
      message.error(error);
      setAccountHasList(false);
      return;
    }
  };

  const set_payable_level = async () => {
    if (!activeAccount) {
      message.error("No Activate Account");
    }

    const transaction2: SimpleTransaction =
      await aptos.transaction.build.simple({
        sender: activeAccount!.accountAddress,
        data: {
          function: `${moduleAddress}::contract_v3::set_payable_level`,
          functionArguments: ["1", payable_level.toString()],
        },
      });
    try {
      // sign and submit transaction to chain
      const response = await aptos.signAndSubmitTransaction({
        signer: activeAccount!,
        transaction: transaction2,
      });
      // wait for transaction
      await aptos.waitForTransaction({ transactionHash: response.hash });
      message.success("success");
      setOnchainPayableLevel(payable_level);
    } catch (error: any) {
      message.error(error);
      return;
    }
  };

  useEffect(() => {
    fetchList();
  }, [activeAccount?.accountAddress]);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen px-4">
      <div>
        {/* Text */}
        <h1 className="text-4xl font-bold mb-2">Welcome to Aptos!</h1>
        <p className="text-lg mb-8">You are now logged in</p>

        {/* Button */}
        <div className="grid gap-2">
          {activeAccount ? (
            <>
              {accountHasList ? (
                <>
                  Current Payable Level: {onchain_payable_level}
                  <div className="flex">
                    Set Payable Level:
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={payable_level}
                      onChange={(event) =>
                        setPayableLevel(parseInt(event.target.value))
                      }
                    ></input>
                  </div>
                  <button
                    className="flex justify-center items-center border rounded-lg px-8 py-2 shadow-sm"
                    onClick={set_payable_level}
                    disabled={!payable_level}
                  >
                    {!payable_level
                      ? "Payable Level should be 1-5"
                      : "Set Payable Level"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="flex justify-center items-center border rounded-lg px-8 py-2 shadow-sm"
                    onClick={create_agent}
                    disabled={agentAccount != null}
                  >
                    {agentAccount ? "Agent created" : "Create a new agent"}
                  </button>
                  <button
                    className="flex justify-center items-center border rounded-lg px-8 py-2 shadow-sm"
                    onClick={addNewList}
                    disabled={!agentAccount}
                  >
                    {!agentAccount
                      ? "You should Create an Agent First"
                      : "Create a new list"}
                  </button>
                </>
              )}
              <div
                className="flex justify-center items-center border rounded-lg px-8 py-2 shadow-sm cursor-pointer"
                onClick={copyToClipboard}
              >
                <GoogleLogo />
                {collapseAddress(activeAccount?.accountAddress.toString())}
              </div>
            </>
          ) : (
            <p>Not logged in</p>
          )}
          <button
            className="flex justify-center bg-red-50 items-center border border-red-200 rounded-lg px-8 py-2 shadow-sm shadow-red-300 hover:bg-red-100 active:scale-95 transition-all"
            onClick={disconnectKeylessAccount}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
