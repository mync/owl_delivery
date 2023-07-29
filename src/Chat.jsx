import {useContext, useEffect, useState} from "react"
import {db} from "./firebase";
import { collection, query, where, onSnapshot, setDoc, doc, getDocs, getDoc } from "firebase/firestore";
import ChatTop from './components/chatTop'
import { ChatContext } from "./context/ChatContext";
import Input from "./components/Input";
import Messages from "./components/Messages";
import { AuthContext } from "./context/AuthContext";
import Send from "./Send"

function Chat(){
  
  const {chatsData, dispatch} = useContext(ChatContext);
  const {currentUser} = useContext(AuthContext)
  const [visible, setVisible] = useState(true)
  

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setVisible(false)
      } else {
        setVisible(true)
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);


  if (chatsData.otherUserEmail==''){
  return (
      <div className="h-[100%] w-[100%] flex flex-col justify-center items-center bg-yellow-200 gap-3 overflow-hidden">
          <span className="">Welcome to Owl Delivery. </span>
          A Chat app that can share files or folders <span className="font-medium">of any size</span>
          ... if you have enough disk space
      </div>
    )
  }

  return (
    <div className="h-[100%] w-[100%] bg-yellow-100">
      <ChatTop/>
      <div className="h-[calc(100%-52px)]">
      {chatsData.chatting? 
        <div className='flex flex-col h-[100%] w-[100%]'>
          <Messages chatId ={chatsData.currentChat}/>
          <Input user = {chatsData.otherUserEmail}/>
        </div>
        :
        <Send/>
      }
      </div>
    </div>
  )
}

export default Chat
