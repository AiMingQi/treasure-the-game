import { useEffect, useMemo, useState, useCallback } from 'react';
import * as anchor from '@project-serum/anchor';

import styled from 'styled-components';
import { Container, Snackbar } from '@material-ui/core';
import Paper from '@material-ui/core/Paper';
import Alert from '@material-ui/lab/Alert';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletDialogButton } from '@solana/wallet-adapter-material-ui';
import {
  awaitTransactionSignatureConfirmation,
  CandyMachineAccount,
  CANDY_MACHINE_PROGRAM,
  getCandyMachineState,
  mintOneToken,
} from './candy-machine';
import { AlertState } from './utils';
import { Header } from './Header';
import { MintButton } from './MintButton';
import { GatewayProvider } from '@civic/solana-gateway-react';

const ConnectButton = styled(WalletDialogButton)`
  width: 100%;
  height: 60px;
  margin-top: 10px;
  margin-bottom: 5px;
  background: linear-gradient(180deg, #604ae5 0%, #813eee 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

const MintContainer = styled.div``; // add your owns styles here

export interface HomeProps {
  candyMachineId?: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  txTimeout: number;
  rpcHost: string;
}

const Home = (props: HomeProps) => {
  const [isUserMinting, setIsUserMinting] = useState(false);
  const [candyMachine, setCandyMachine] = useState<CandyMachineAccount>();
  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: '',
    severity: undefined,
  });

  const rpcUrl = props.rpcHost;
  const wallet = useWallet();

  const anchorWallet = useMemo(() => {
    if (
      !wallet ||
      !wallet.publicKey ||
      !wallet.signAllTransactions ||
      !wallet.signTransaction
    ) {
      return;
    }

    return {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    } as anchor.Wallet;
  }, [wallet]);

  const refreshCandyMachineState = useCallback(async () => {
    if (!anchorWallet) {
      return;
    }

    if (props.candyMachineId) {
      try {
        const cndy = await getCandyMachineState(
          anchorWallet,
          props.candyMachineId,
          props.connection,
        );
        setCandyMachine(cndy);
      } catch (e) {
        console.log('There was a problem fetching Candy Machine state');
        console.log(e);
      }
    }
  }, [anchorWallet, props.candyMachineId, props.connection]);

  const onMint = async () => {
    try {
      setIsUserMinting(true);
      document.getElementById('#identity')?.click();
      if (wallet.connected && candyMachine?.program && wallet.publicKey) {
        const mintTxId = (
          await mintOneToken(candyMachine, wallet.publicKey)
        )[0];

        let status: any = { err: true };
        if (mintTxId) {
          status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            props.txTimeout,
            props.connection,
            true,
          );
        }

        if (status && !status.err) {
          setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded!',
            severity: 'success',
          });
        } else {
          setAlertState({
            open: true,
            message: 'Mint failed! Please try again!',
            severity: 'error',
          });
        }
      }
    } catch (error: any) {
      let message = error.msg || 'Minting failed! Please try again!';
      if (!error.msg) {
        if (!error.message) {
          message = 'Transaction Timeout! Please try again.';
        } else if (error.message.indexOf('0x137')) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf('0x135')) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          window.location.reload();
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: 'error',
      });
    } finally {
      setIsUserMinting(false);
    }
  };

  useEffect(() => {
    refreshCandyMachineState();
  }, [
    anchorWallet,
    props.candyMachineId,
    props.connection,
    refreshCandyMachineState,
  ]);
  
  return (
    <Container style={{ marginTop: 50 }}>
      <Container maxWidth="md" style={{ position: 'relative' }}>
        <Paper style={{ padding: 24, margin: 20, backgroundColor: '#151A1F', borderRadius: 6 }}>
        <h1>You have discovered a new futuristic style of Solana smart contract based treasure box. </h1>
          <img src="https://gateway.pinata.cloud/ipfs/QmXGNrdtuprNqMJk8Uf9u9VSFKKTz3tqGqhzEiboDDnZfB" width="100%"/>
          <p>When you connect your Solana wallet, the site receives your Public Key.  This unlocks the ability to mint puzzle pieces and see more information about the treasure box. This is completely safe behavior.</p>
        </Paper>
        <Paper
          style={{ padding: 24, backgroundColor: '#151A1F', borderRadius: 6 }}
        >
          {!wallet.connected ? (
            <ConnectButton>Connect Wallet</ConnectButton>
          ) : (
            <>
              <Header candyMachine={candyMachine} />
              <MintContainer>
                {candyMachine?.state.isActive &&
                candyMachine?.state.gatekeeper &&
                wallet.publicKey &&
                wallet.signTransaction ? (
                  <GatewayProvider
                    wallet={{
                      publicKey:
                        wallet.publicKey ||
                        new PublicKey(CANDY_MACHINE_PROGRAM),
                        //@ts-ignore
                        signTransaction: wallet.signTransaction,
                      }}
                    gatekeeperNetwork={
                      candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                    }
                    clusterUrl={rpcUrl}
                    options={{ autoShowModal: false }}
                  >
                    <MintButton
                      candyMachine={candyMachine}
                      isMinting={isUserMinting}
                      onMint={onMint}
                    />
                  </GatewayProvider>
                ) : (
                  <MintButton
                    candyMachine={candyMachine}
                    isMinting={isUserMinting}
                    onMint={onMint}
                  />
                )}
                <p>Now that you have connected your Solana wallet to the site you can Mint a Non Fungible Token that is created from the original artwork of <a href="https://mitchellvalentine.com" target="_blank" rel="noopener">Mitchell Valentine</a></p>
                <p>These NFTs also combine together to form the seed for the address that receives the funds from each minting.</p>
                <p>The artist's address is listed in the NFT as a Creator and will receive royalties from the sale of these NFTs in the secondary markets.</p>
              </MintContainer>
            </>
          )}
        </Paper>
        <Paper style={{ padding: 24, margin: 20, backgroundColor: '#151A1F', borderRadius: 6 }}>
          
          <p>This is not one of those scam sites that claim if you put money in, you will magically get money out.</p>  
          <p>This site is not a trick, but an open source experiment to understand how Solana Metaplex Candy Machines work.</p> 
          <p>This is a real world puzzle deployed on the Solana mainnet, created for your entertainment and by purchasing the NFTs inside you are merely purchasing part of an art project.</p>
          <p>Locked within the box are 24 unique images.</p>
          <p>The one who finds the seed within them wins the treasure contained in the box.</p>
          <p>The seed controls the fun.</p>
          <p>Peer inside this address to see how much fun is there: 
          <br></br><a href="https://solscan.io/account/Fjfuoyfkmn5LjBwvERQhzvqWtikoLmjGegKnxnCiDXhq" target="_blank" rel="noopener">Fjfuoyfkmn5LjBwvERQhzvqWtikoLmjGegKnxnCiDXhq</a></p>
          <p>This is the address of the candy machine if it helps you to unlock the puzzle:</p>
          <p><a href="https://solscan.io/account/s5HtaEVGeY4ZtTXHFCz58vXmfBWB2ANfteuvRnYZBoE" target="_blank" rel="noopener">s5HtaEVGeY4ZtTXHFCz58vXmfBWB2ANfteuvRnYZBoE</a></p> 
          <p>The creator of this game does know the seed.  They could certainly just steal the funds at anytime.</p>
          <p>However, the reason they created the game was to see how durable the <a href="https://docs.metaplex.com/candy-machine-v2/" target="_blank" rel="noopener">Metaplex Candy Machine v2 contract</a> is.</p>
          <p>The hope is that no one can steal the seeds before the tokens are minted.</p>
          <p>If the seeds are truly safe inside, then many more versions of the-game will blossom soon after this game is complete.</p>
          <p>The bounty for the hack is all the Solana is in the account.</p>
          <p>Visit our github repo to see the front-end code. <a href="https://github.com/AiMingQi/treasure-the-game" target="_blank" rel="noopener">Github</a></p>

      
        </Paper>
      </Container>

      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Home;
