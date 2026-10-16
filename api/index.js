const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const app = express();
app.use(cors({origin:'*'}));
app.use(express.json());

let sock=null;
async function getSock(){
  if(sock) return sock;
  const { state, saveCreds } = await useMultiFileAuthState('./session-server');
  const { version } = await fetchLatestBaileysVersion();
  sock = makeWASocket({version, logger:pino({level:'silent'}), printQRInTerminal:false, auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,pino({level:'silent'}))}, browser:['Ubuntu','Chrome','20.0.04']});
  sock.ev.on('creds.update', saveCreds);
  return sock;
}

app.get('/', (req,res)=> res.json({status:'Lexaa Backend Jalan', buyer1:'active'}));

app.post('/api/spotify/pairing', async (req,res)=>{
  try{
    const users = JSON.parse(fs.readFileSync('./users.json','utf8'));
    const u=users.find(x=>x.username==req.body.username && x.password==req.body.password && x.active);
    if(!u) return res.json({success:false, msg:'Username/password salah atau expired'});
    const client=await getSock();
    let num=req.body.targetNumber.replace(/[^0-9]/g,'');
    if(num.startsWith('0')) num='62'+num.substring(1);
    if(!num.startsWith('62')) num='62'+num;
    const code=await client.requestPairingCode(num);
    console.log(`KODE ${num}: ${code}`);
    return res.json({success:true, pairingCode:code});
  }catch(e){
    console.log('ERROR', e.message);
    res.json({success:false, msg:e.message});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('SERVER JALAN DI PORT '+PORT));
