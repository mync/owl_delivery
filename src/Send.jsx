import React, {useEffect, useState } from "react"
import {db} from "./firebase";
import { doc, setDoc, collection, onSnapshot, getDoc, updateDoc } from "firebase/firestore";
import ChatTop from './components/chatTop'
import Connection from "./Connection"

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

const chunkSize = 64000;
let setDropBoxTextO;
let setAcceptedO;
let setDisplayInfoO = null;

function Send() {
  
  const [dropBoxText, setDropBoxText] = useState('Drag files or a folder to send');
  const [key, setKey] = useState('');
  const [items, setItems] = useState(null)
  const [accepted, setAccepted] = useState(false)
  const [displayInfo, setDisplayInfo] = useState({})
  
  let connection;
  
  useEffect(() => {
    if (accepted){
      setDropBoxText('Sending file!')
    }
  }, [accepted]);

  setAcceptedO = setAccepted
  setDropBoxTextO = setDropBoxText;
  setDisplayInfoO = setDisplayInfo

  function dragOverHandler(ev) {
    ev.preventDefault();
  }

  function dropHandler(ev) {

    console.log("File(s) dropped");
    ev.preventDefault();
    
    if (ev.dataTransfer.items) {
      if (ev.dataTransfer.items.length===1){
        setDropBoxText(ev.dataTransfer.items[0].getAsFile().name)
      }
      else{
        setDropBoxText(`${ev.dataTransfer.items.length} items Dropped`)
      }
      setItems(ev.dataTransfer.items[0].getAsFile());
    } 
  }

  async function handleSend(){
    console.log(items)
    connection = new Connection(setDropBoxTextO, setAcceptedO, setDisplayInfoO, 0)
    console.log(await offer(items))
  }

  function handleAnswer(){
    console.log(key)
    connection = new Connection(setDropBoxTextO, setAcceptedO, setDisplayInfoO, 0)
    recieve(key)
  }

  return (
    <div className="h-[100%] w-[100%]">
      <div className='flex flex-col justify-center items-center w-[100%] h-[100%] bg-yellow-200 gap-3 overflow-hidden'>
        <div
          id="drop_zone"
          onDrop={(event)=>dropHandler(event)}
          onDragOver={(event)=>dragOverHandler(event)}
          className = 'flex min-w-[300px] w-[40%] h-[40%] bg-orange-50 justify-center items-center'>
          <p className="p-2">{dropBoxText}</p>
        </div>
        {items? <button className="bg-blue-300 rounded w-[100px] h-[35px]" onClick={handleSend}>Send</button>:
              <div >
                <input className='pl-2 w-[200px] h-[35px] shadow' placeholder="Enter key" onChange={(e)=>setKey(e.target.value)}></input>
                <button className="bg-blue-300 rounded w-[100px] h-[35px]" onClick={handleAnswer}>Answer</button>
              </div>
        }

      </div>
    </div>
  )
}

export default Send

let pc;
let sendChannel;
let receiveChannel;
let fileReader;
let receiveBuffer = [];
let receivedSize = 0;
let file; 
let size;
let name;
let sendProgress = {max:0};
let receiveProgress = {max:0};
let accepted = false;
let timeLeft = 30;

function checkForAccepted(){
  if (accepted){ 
    setAcceptedO(true)
    return;
  }
  setDropBoxTextO(`Waiting for answer ${timeLeft}`)
  if (timeLeft>0){
    timeLeft-=1;
    setTimeout(checkForAccepted,(timeLeft)*100);
  }
  else {
    closeDataChannels()
  }
}

async function offer(itemAsFile){
  

  file = itemAsFile
  pc = new RTCPeerConnection(servers);
  sendChannel = pc.createDataChannel('sendDataChannel');
  sendChannel.binaryType = 'arraybuffer';
  sendChannel.bufferedAmountLowThreshold = 8*chunkSize;
  
  console.log('Created send data channel');
  
  sendChannel.addEventListener('open', onSendChannelStateChange);
  sendChannel.addEventListener('close', onSendChannelStateChange);
  sendChannel.addEventListener('error', onError);

  const callDoc = doc(collection(db,'calls'));
  const offerCandidates = collection(callDoc,'offerCandidates');
  const answerCandidates = collection(callDoc,'answerCandidates');


  pc.onicecandidate = async (event) => {
    event.candidate && (await setDoc(doc(offerCandidates),event.candidate.toJSON()));
  };

  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);
  console.log(file.name, file.size)
  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
    fileName: file.name,
    size: file.size
  };

  await setDoc(callDoc,{ offer });

  onSnapshot(callDoc,(snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  onSnapshot(answerCandidates,(snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        accepted = true
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });

  checkForAccepted()

  return callDoc.id;

}


function onSendChannelStateChange() {
  if (sendChannel) {
    const {readyState} = sendChannel;
    console.log(`Send channel state is: ${readyState}`);
    if (readyState === 'open') {
      sendData();
    }
  }
}

function onError(error) {
  if (sendChannel) {
    console.error('Error in sendChannel:', error);
    return;
  }
  console.log('Error in sendChannel which is already closed:', error);
}

function sendData() {

  console.log(`File is ${[file.name, file.size, file.type, file.lastModified].join(' ')}`);
  if (file.size === 0) {
    closeDataChannels();
    return;
  }

  sendProgress.max = file.size;
  receiveProgress.max = file.size;
  fileReader = new FileReader();
  let offset = 0;
  fileReader.addEventListener('error', error => console.error('Error reading file:', error));
  fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
  
  fileReader.addEventListener('load', async e => {  
    
    console.log(sendChannel.bufferedAmount)
    sendChannel.send(e.target.result);
    offset += e.target.result.byteLength;
    console.log(sendProgress.value)
    sendProgress.value = offset;
    if (offset < file.size) {
      readSlice(offset);
    }

  });

  const readSlice = async o => {
    if(sendChannel.bufferedAmount>sendChannel.bufferedAmountLowThreshold){
      setTimeout(()=>readSlice(o), 10)
      return 
    }
    console.log(offset)
    let toADD = chunkSize
    const slice = file.slice(offset, o + toADD);
    fileReader.readAsArrayBuffer(slice);
  };
  readSlice(0);
}


function closeDataChannels() {
  console.log('Closing data channels');
  if (sendChannel){
    sendChannel.close();
    console.log(`Closed data channel with label: ${sendChannel.label}`);
  }
  sendChannel = null;

  if (pc){pc.close();}
  pc = null;
  console.log('Closed peer connection');

}

async function recieve(key){

  const callId = key;
  pc = new RTCPeerConnection(servers);

  pc.addEventListener('datachannel', receiveChannelCallback);
  
  const callDoc = doc(collection(db,'calls'),callId);

  const answerCandidates = collection(callDoc,'answerCandidates');
  const offerCandidates = collection(callDoc,'offerCandidates');

  pc.onicecandidate = (event) => {
    event.candidate && setDoc(doc(answerCandidates),event.candidate.toJSON());
  };

  const callData = (await getDoc(callDoc)).data();

  const offerDescription = callData.offer;
  size = offerDescription.size
  name = offerDescription.fileName
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await updateDoc(callDoc,{ answer });

  onSnapshot(offerCandidates,(snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' && pc) {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
}


function receiveChannelCallback(event) {

  console.log('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.binaryType = 'arraybuffer';
  receiveChannel.onmessage = onReceiveMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;

  receivedSize = 0;

}

function onReceiveMessageCallback(event) {
  console.log(receivedSize)
  receiveBuffer.push(event.data);
  receivedSize += event.data.byteLength;
  receiveProgress.value = receivedSize;

  if (receivedSize === size) {
    const received = new Blob(receiveBuffer);
    console.log(received)
    receiveBuffer = [];

    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(received);
    downloadLink.download = name;
    downloadLink.click();

    // const emptyData = new Uint8Array(0);
    // const blob = new Blob([emptyData], { type: 'application/octet-stream' });
    // const downloadUrl = URL.createObjectURL(blob);
    // const link = document.createElement('a');
    // link.href = downloadUrl;
    // link.download = 'pikachu.zip';
    // link.click();  
    // URL.revokeObjectURL(downloadUrl);

    closeDataChannels();
  }
}

async function onReceiveChannelStateChange() {
  
  if (receiveChannel) {
    const readyState = receiveChannel.readyState;
    console.log(`Receive channel state is: ${readyState}`);
  }
  
}
