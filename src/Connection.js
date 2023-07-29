import {doc, onSnapshot, setDoc } from 'firebase/firestore'
import {collection, getDoc, updateDoc} from "firebase/firestore"
import { db } from './firebase';

const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
    iceCandidatePoolSize: 10,
  };

class Connection {
    constructor(setDropBoxTextO, setAcceptedO, setDisplayInfoO, startFrom = 0) {
      
      this.setDropBoxTextO = setDropBoxTextO;
      this.setAcceptedO = setAcceptedO;
      this.setDisplayInfoE = setDisplayInfoO;
      this.startFrom = startFrom;

      this.chunkSize = 64000;
      this.pc = null;
      this.sendChannel = null;
      this.receiveChannel = null;
      this.fileReader = null;
      this.receiveBuffer = [];
      this.receivedSize = 0;
      this.file = null;
      this.size = null;
      this.name = null;
      this.sendProgress = { max: 0 };
      this.receiveProgress = { max: 0 };
      this.accepted = false;
      this.timeLeft = 30;
    }
  
    checkForAccepted() {
      if (this.accepted) {
        this.setAcceptedO(true);
        return;
      }
  
      this.setDropBoxTextO(`Waiting for answer ${this.timeLeft}`);
  
      if (this.timeLeft > 0) {
        this.timeLeft -= 1;
        setTimeout(this.checkForAccepted.bind(this), this.timeLeft * 100);
      } else {
        this.closeDataChannels();
      }
    }

    async offer(itemAsFile){

        this.file = itemAsFile
        this.pc = new RTCPeerConnection(servers);
        this.sendChannel = this.pc.createDataChannel('sendDataChannel');
        this.sendChannel.binaryType = 'arraybuffer';
        this.sendChannel.bufferedAmountLowThreshold = 8*this.chunkSize;
        
        console.log('Created send data channel');
        
        this.sendChannel.addEventListener('open', this.onSendChannelStateChange.bind(this));
        this.sendChannel.addEventListener('close', this.onSendChannelStateChange.bind(this));
        this.sendChannel.addEventListener('error', this.onError.bind(this));
        
        const callDoc = doc(collection(db,'calls'));
        const offerCandidates = collection(callDoc,'offerCandidates');
        const answerCandidates = collection(callDoc,'answerCandidates');
        
        this.pc.onicecandidate = async (event) => {
            console.log('added ice candidates')
            event.candidate && (await setDoc(doc(offerCandidates),event.candidate.toJSON()));
        };
        
        const offerDescription = await this.pc.createOffer();
        await this.pc.setLocalDescription(offerDescription);
        console.log(this.file.name, this.file.size)
        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
            fileName: this.file.name,
            size: this.file.size
        };
        
        await setDoc(callDoc,{ offer });
        
        onSnapshot(callDoc,(snapshot) => {
            const data = snapshot.data();
            if (!this.pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            this.pc.setRemoteDescription(answerDescription);
            }
        });
        
        onSnapshot(answerCandidates,(snapshot) => {
            snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                this.accepted = true
                const candidate = new RTCIceCandidate(change.doc.data());
                this.pc.addIceCandidate(candidate);
            }
            });
        });
        
        this.checkForAccepted()
        return callDoc.id;
      
    }
      
      
    onSendChannelStateChange() {
        console.log(this)
        if (this.sendChannel) {
          const {readyState} = this.sendChannel;
          console.log(`Send channel state is: ${readyState}`);
          if (readyState === 'open') {
            this.sendData();
          }
        }
    }
      
    onError(error) {
        if (this.sendChannel) {
          console.error('Error in sendChannel:', error);
          return;
        }
        console.log('Error in sendChannel which is already closed:', error);
    }
      
    sendData() {  

        console.log(`File is ${[this.file.name, this.file.size, this.file.type, this.file.lastModified].join(' ')}`);
        if (this.file.size === 0) {
            this.closeDataChannels();
          return;
        }
      
        this.sendProgress.max = this.file.size;
        this.sendProgress.value = 0 
        this.receiveProgress.max = this.file.size;
        this.fileReader = new FileReader();
        let offset = 0;
        this.fileReader.addEventListener('error', error => console.error('Error reading file:', error));
        this.fileReader.addEventListener('abort', event => console.log('File reading aborted:', event));
        
        this.fileReader.addEventListener('load', async e => {  
          
          this.sendChannel.send(e.target.result);
          offset += e.target.result.byteLength;
          console.log(this.sendProgress.value)
          this.sendProgress.value = offset;
          if (offset < this.file.size) {
            readSlice(offset);
          }
      
        });
      
        const readSlice = async o => {
          if(this.sendChannel.bufferedAmount>this.sendChannel.bufferedAmountLowThreshold){
            setTimeout(()=>readSlice(o), 10)
            return 
          }
          console.log(offset)
          let toADD = this.chunkSize
          const slice = this.file.slice(offset, o + toADD);
          this.fileReader.readAsArrayBuffer(slice);
        };
        readSlice(0);
    }
      
     closeDataChannels() {
        console.log('Closing data channels');
        if (this.sendChannel){
            this.sendChannel.close();
          console.log(`Closed data channel with label: ${this.sendChannel.label}`);
        }
        this.sendChannel = null;
      
        if (this.pc){this.pc.close();}
        this.pc = null;
        console.log('Closed peer connection');
      
    }
      
    async recieve(key){
      
        const callId = key;
        this.pc = new RTCPeerConnection(servers);
        
        this.pc.addEventListener('datachannel', (event) => this.receiveChannelCallback.bind(this,event));
        const callDoc = doc(collection(db,'calls'),callId);
      
        const answerCandidates = collection(callDoc,'answerCandidates');
        const offerCandidates = collection(callDoc,'offerCandidates');
      
        this.pc.onicecandidate = (event) => {
          event.candidate && setDoc(doc(answerCandidates),event.candidate.toJSON());
        };
      
        const callData = (await getDoc(callDoc)).data();
      
        const offerDescription = callData.offer;
        this.size = offerDescription.size
        this.name = offerDescription.fileName
        await this.pc.setRemoteDescription(new RTCSessionDescription(offerDescription));
      
        const answerDescription = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answerDescription);
      
        const answer = {
          type: answerDescription.type,
          sdp: answerDescription.sdp,
        };
      
        await updateDoc(callDoc,{ answer });
      
        onSnapshot(offerCandidates,(snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' && this.pc) {
              let data = change.doc.data();
              this.pc.addIceCandidate(new RTCIceCandidate(data));
            }
          });
        });
    }
      
      
    receiveChannelCallback(event) {
        
        console.log('Receive Channel Callback');
        this.receiveChannel = event.channel;
        this.receiveChannel.binaryType = 'arraybuffer';
        this.receiveChannel.onmessage = this.onReceiveMessageCallback;
        this.receiveChannel.onopen = this.onReceiveChannelStateChange;
        this.receiveChannel.onclose = this.onReceiveChannelStateChange;
      
        this.receivedSize = 0;
      
    }
      
    onReceiveMessageCallback(event) {
      console.log(this)
      this.receiveBuffer.push(event.data);
      this.receivedSize += event.data.byteLength;
      this.receiveProgress.value = this.receivedSize;
    
      if (this.receivedSize === this.size) {
        const received = new Blob(this.receiveBuffer);
        console.log(received)
        this.receiveBuffer = [];
    
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(received);
        downloadLink.download = this.name;
        downloadLink.click();
    
        // const emptyData = new Uint8Array(0);
        // const blob = new Blob([emptyData], { type: 'application/octet-stream' });
        // const downloadUrl = URL.createObjectURL(blob);
        // const link = document.createElement('a');
        // link.href = downloadUrl;
        // link.download = 'pikachu.zip';
        // link.click();  
        // URL.revokeObjectURL(downloadUrl);
    
        this.closeDataChannels();
      }
    }
      
    async onReceiveChannelStateChange() {
        
        if (this.receiveChannel) {
        const readyState = this.receiveChannel.readyState;
        console.log(`Receive channel state is: ${readyState}`);
        }
        
    }
      
  }

export default Connection;