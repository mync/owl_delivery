import {useState, useEffect, useContext} from "react";
import { FaSun } from "react-icons/fa";
import { FaMoon } from "react-icons/fa";
import {BiSearch} from "react-icons/bi"
import {AiOutlinePlus} from "react-icons/ai"
import {IoMdMailUnread} from "react-icons/io"
import useDarkMode from "./hooks/useDarkMode"
import { signOut } from "firebase/auth";
import {auth, db} from "./firebase"
import {doc, onSnapshot, setDoc } from 'firebase/firestore'
import {query, getDocs, collection, where, getDoc} from "firebase/firestore"
import PropTypes from 'prop-types';
import owl from './assets/owl.jpg'
import { ChatContext } from "./context/ChatContext";
import { AuthContext } from "./context/AuthContext";
import { useAuthState } from "react-firebase-hooks/auth";
import {v4 as uuid} from "uuid"

let setSearchedToEmpty;

const Sidebar = () =>{

  const {chatsData, dispatch} = useContext(ChatContext);

  const [searched, setSearched] = useState('');
  const [resultList, setResultList] = useState([]);
  const [tried, setTried] = useState(false);
  const [plus, setPlus] = useState(true)
  
  setSearchedToEmpty = ()=>{
    setResultList([])
    setSearched('')
    setTried(false)
  }

  const currentUser = useAuthState(auth)[0].email

  async function getMessageArray(docNumberInteral, currentChatInteral){

        console.log('getting ',currentChatInteral,' ',docNumberInteral, ' from firestore')
        const messageDoc = await getDoc(await doc(db,'chats/'+currentChatInteral+'/messages', String(docNumberInteral)))
        const messagesArray = messageDoc.data().array
        if (! (currentChatInteral in chatsData.messages)) { chatsData.messages[currentChatInteral] = {} } 
        chatsData.messages[currentChatInteral][docNumberInteral] = messagesArray
        return messagesArray
    
}

  // listening to file sharing calls
  // useEffect(()=>{
  //   const recieveCalls= async () => {

  //     const unsub = onSnapshot(doc(db, "calls", currentUser), async (doc) => {
  //       const data = doc.data();
  //       Object.keys(data).forEach(async (otherUser) => {
  //         if (otherUser in data){
            
  //           otherUser = otherUser.replace('-','.')
  //           const chatId = currentUser <= otherUser
  //           ? currentUser +'#'+otherUser
  //           : otherUser+'#'+currentUser;
            
  //         }
  //       });
  //     });

  //     return () => {
  //       unsub();
  //     };

  //   };

  //  recieveCalls()
  // })

  // getting and listening to chat list  
  
  // get chats
  useEffect(() => {
    const getChats = async () => {

      const unsub = onSnapshot(doc(db, "users", currentUser), async (doc) => {
        
        await dispatch({type:'chat_list_updated',chats: doc.data().chats, otherUserEmail: ''});
        console.log('fethcing chat list snapshot')
      });
      
      return () => {
        unsub();
      };
    };
    getChats();

  },[]);

  // getting chat info
  useEffect(()=>{
    if (chatsData.chats.length==0){return}
    const getChatInfo = async () => {
      console.log('getting num of docs')
      
      const lastMessages = {}; 

      const chatIds = Object.keys(chatsData.chatsInfo)
      for (var i=0; i<chatIds.length; i++){
        const chatId = chatIds[i];
        const ref = await doc(db,'chats',chatId);
        const docSnapshot = await getDoc(ref);
        const data = await docSnapshot.data()
        if (!(chatId in chatsData.chatsInfo)){chatsData.chatsInfo[chatId] = {} }
        chatsData.chatsInfo[chatId].numDocs = data.numDocs;
        const messages = await getMessageArray(data.numDocs, chatId);
        
        lastMessages[chatId] = messages[messages.length-1]
      }
      
      dispatch({type: 'last_messages_updated', lastMessages: lastMessages})
    };
    setTimeout(getChatInfo,100);
  },[chatsData.chats]);

  // notification handling  
  useEffect(()=>{
    const recieveMessages = async () => {

      const unsub = onSnapshot(doc(db, "notifications", currentUser), async (doc) => {
        const data = doc.data();
        Object.keys(data).forEach(async (otherUser) => {
          if (otherUser in data){
            const notiArr = data[otherUser]
            console.log(notiArr)

            otherUser = otherUser.replace('-','.')
            const chatId = currentUser <= otherUser
            ? currentUser +'#'+otherUser
            : otherUser+'#'+currentUser;
            
            const numDocs = notiArr[notiArr.length-1].info;
            await getMessageArray(numDocs,chatId);
            
            dispatch({type:'notifcation', from:otherUser, notificationArray:notiArr});
          }
        });
      });

      return () => {
        unsub();
      };

    };

   recieveMessages()
  }, []);


  function logout(){
    signOut(auth).then(()=>{
  
    }).catch((error)=>{
      console.log(error);
    })
  }

  async function findUser(){

    if (chatsData.allUsers.has(searched) || searched==currentUser) return 
    const q = query(
      collection(db, "users"),
      where("email", "==", searched)
    );
    try {
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        setResultList([doc.data()]);
      });
      setPlus(true)
    } catch (err) {
      setResultList([]);
    }
    setTried(true)
  }

  function findLocalUser(searched){

    if (tried || !searched) return 
    const res = []
    function containsCaseInsensitive(a, b) {
      return a.toLowerCase().includes(b.toLowerCase());
    }
    const chatsArray = chatsData.chats;
    for (var i = 0; i < chatsArray.length; i++) {
      var u = chatsArray[i];
      if (containsCaseInsensitive(u.name,searched)) res.push(u)
    }
    
    res.sort(function(a, b) {
      var nameA = a.name.toUpperCase(); 
      var nameB = b.name.toUpperCase();
      
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0; 
    });
    setPlus(false)
    setResultList(res)
  }


  return(
        <div className="bg-gray-100 dark:bg-gray-800 w-[300px] h-[100%] flex flex-col border-x-[0px] border-r-1 shadow-lg pt-1 justify-between">
            <div className="flex flex-col pt-2 h-[90%]">
              <div className="px-3 flex flex-row gap-3 min-h-[40px] overflow-hidden">
                <BiSearch size='28' color="white" onClick={findUser} className="hover:cursor-pointer"/>
                <input className="focus:outline-none bg-transparent text-white placeholder:color-white shadow px-1 w-[100%] h-[28px] border-b-[1px]" 
                placeholder="Find a user" value = {searched} 
                onKeyDown={(e)=>{if(e.key=='Enter') findUser()}} onChange={async (e)=>{setResultList([]); setSearched(e.target.value); if(searched) setTried(false); findLocalUser(e.target.value);}}/>
              </div>
              {searched? <Results users={resultList} text={tried ? 'user not found' : 'Press Enter to search'} plus={plus}/> : <Chats/>}
            </div>

            <div className="flex justify-between px-3">
              <ThemeIcon/> 
              <button onClick = {logout} className="flex items-center text-gray-100 bg-red-400 rounded h-[30px] justify-center mt-3 pb-1 px-2">Logout</button>
            </div>
        </div>
    )
}

const ThemeIcon = () => {
    const [darkTheme, setDarkTheme] = useDarkMode();
    const handleMode = () => setDarkTheme(!darkTheme);
    return (
      <span onClick={handleMode}>
        {darkTheme ? (
          <FaSun size='24' className='flex h-[50px] text-orange-200' />
        ) : (
          <FaMoon size='24' className='flex h-[50px] text-gray-200' />
        )}
      </span>
    );
  };

const Chats = () => {

  const {dispatch, chatsData} = useContext(ChatContext);
  const [displayUsers, setUsers] = useState([])
  const {currentUser} = useContext(AuthContext)

  useEffect(()=>{
    if  (!chatsData.chats) return 
    console.log('j,,')
    console.log('changing chats display')
    const chats = [...chatsData.chats]
    for (var i=0; i<chats.length; i++){
      chats[i].lastMessage = ''
      chats[i].lastTime = null 
      if (chats[i].chatId in chatsData.lastMessages && chatsData.lastMessages[chats[i].chatId]){
        
        const message = chatsData.lastMessages[chats[i].chatId]
        const chatId = chats[i].chatId
        
        if(chatId in chatsData.unread) chats[i].unreadMessages = chatsData.unread[chatId]  
        else chats[i].unreadMessages = 0

        if (message.type=='system'){
          chats[i].lastMessage = '';
          chats[i].lastTime = message.time
          continue;
        }
        console.log(currentUser, message.author, chats[i].name)
        if (message.author === currentUser){
          chats[i].lastMessage = 'You : '+message.message
          chats[i].lastTime = message.time
        }
        else{
          chats[i].lastMessage = message.message
          chats[i].lastTime = message.time
        }
      
      }
    }

    chats.sort((a, b) => {
      if (a.lastTime === null && b.lastTime === null) {
        return 0;
      } else if (a.lastTime === null) {
        return 1;
      } else if (b.lastTime === null) {
        return -1;
      } else {
        const aTimestamp = a.lastTime.seconds * 1000 + a.lastTime.nanoseconds / 1e6;
        const bTimestamp = b.lastTime.seconds * 1000 + b.lastTime.nanoseconds / 1e6;
        return bTimestamp - aTimestamp;
      }
    });

    setUsers(chats);
  }, [chatsData.chats, chatsData.lastMessages, chatsData.reloadChatsDisplay,chatsData.unread])

  if(!displayUsers[0]){
    return (
      <div className=" text-white flex justify-center items-center pt-4">No Chats available</div>
    )
  }

  function select(u){
    dispatch({type:'user_changed', otherUserEmail:u.email, otherUserName:u.name, otherUserPhotoURL:u.photoURL})
    setSearchedToEmpty()
  }

  return (
    <div className="flex flex-col h-[100%] overflow-auto">

      {displayUsers.map((u) => 
        ( 
          <div key={u.email} className={`flex justify-center items-center h-[60px] min-w-[100%] gap-2 
            ${u.email!=chatsData.otherUserEmail? 'bg-gray-700 gap-2 hover:bg-gray-600': 'bg-gray-400'}  
            border-gray-900 border-t-[1px]`} 
            onClick={()=>select(u)}>
            
            <img className = 'h-[45px] w-[45px] rounded-full' src={owl} />
            <div className="flex flex-col w-[150px] gap-1">
              <span className='text-gray-100 w-[150px] overflow-hidden'>{u.name} </span>
              <span className="w-[150px] text-[14px] text-gray-200 overflow-hidden whitespace-nowrap">{u.lastMessage}</span>            
            </div>
            <span className={`w-[80px] text-[32px]  text-transparent overflow-hidden  ${u.unreadMessages==0?'text-transparent':'text-gray-200'}`}><IoMdMailUnread/></span>
          </div>
        )
      )}
    </div>
  );
};


const Results = ({ users = [], text, plus }) => {
    
    const {currentUser} = useContext(AuthContext)
    const {dispatch} = useContext(ChatContext)

    if (users.length==0){
      return (<span className="w-[100%] flex text-white items-center justify-center">{text}</span>)
    }

    async function addUser(u){

      const currentUserEmail = currentUser
      setSearchedToEmpty();
      let docRef = await doc(db,'users',currentUserEmail);
      let oldData = (await getDoc(docRef)).data();

      const currentUserName = oldData.name
      const currentUserPhotoURL = oldData.photoURL

      const chatKey = currentUserEmail<=u.email ? currentUserEmail+'#'+u.email: u.email+'#'+currentUserEmail;

      let oldChats = oldData.chats;
      let newChats = [...oldChats, {name:u.name, email:u.email, photoURL:u.photoURL, chatId:chatKey}];
      oldData.chats = newChats;
      await setDoc(docRef, oldData);
      
      docRef = await doc(db,'users',u.email);
      oldData = (await getDoc(docRef)).data();
      oldChats = oldData.chats;
      newChats = [...oldChats, {name:currentUserName, email: currentUserEmail, photoURL: currentUserPhotoURL, chatId:chatKey}];
      oldData.chats = newChats;
      await setDoc(docRef, oldData);

      docRef = await doc(db,'chats',chatKey)
      await setDoc(docRef, {createdBy : currentUserEmail, date :new Date(), numDocs : 1 , id:chatKey})
      let colRef = await collection(docRef, 'messages')
      docRef = await doc(colRef, '1')

      function getFormattedDate(date) {
    
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        var hour = String(date.getHours())
        var minutes = String(date.getMinutes())
        
        while (hour.length<2)
            hour = '0'+hour
    
        while (minutes.length<2)
            minutes = '0'+minutes
    
        const day = daysOfWeek[date.getDay()];
        const dateNum = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        
        return `${day}, ${dateNum} ${month}, ${year}`;
    }

      const date = new Date()
      await setDoc(docRef,  {array : [{type: 'system', message: 'created on '+getFormattedDate(date)+' by '+currentUser, time : date, id:uuid()}]})
    }

    function select(u){
      if (plus) return 
      dispatch({type:'change_user', otherUserEmail:u.email, otherUserName:u.name, otherUserPhotoURL:u.photoURL})
      setSearchedToEmpty()
    }

    return (
      <div className="flex flex-col h-[100%] overflow-auto">
        {users.map((u) => 
          ( 
            <div key={u.email} className="flex justify-center items-center h-[45px] w-[100%] bg-gray-700 gap-2 hover:bg-gray-600">
              <img className = 'h-[35px] w-[35px] rounded-full' src={owl} />
              <span className={`text-gray-100 overflow-hidden ${plus? 'w-[130px]': 'w-[150px] hover:cursor-pointer'} overflow-hidden`} onClick={()=>select(u)}>{u.name}</span>
              {plus?<div className = "hover:cursor-pointer text-white" onClick={()=>addUser(u)}><AiOutlinePlus size="24"/></div>:''}
            </div>
          )
        )}
      </div>
    );
  };
  
Results.propTypes = {
    users: PropTypes.array.isRequired,
    text: PropTypes.string.isRequired,
    plus: PropTypes.bool.isRequired,
  };
  

  export default Sidebar;










//   useEffect(()=>{
//     const currentChat = chatsData.currentChat
//     if (currentChat=='') return 
    
//     async function reloadMessages(latestNumDocs){
//         console.log('loading/reloading ',currentChat,' ',latestNumDocs, ' from firestore')
//         const messageDoc = await getDoc(await doc(db,'chats/'+currentChat+'/messages', String(latestNumDocs)))
//         const messagesArray = messageDoc.data().array
//         if (! (currentChat in chatsData.messages)) { chatsData.messages[currentChat] = {} } 
//         chatsData.messages[currentChat][latestNumDocs] = messagesArray
//         return messagesArray
//     }

//     async function helper(){

//         const latestNumDocs = chatsData.chatsInfo[currentChat].numDocs
//         chatsData.numDocs = latestNumDocs;

//         await reloadMessages(latestNumDocs,currentChat)
//         if(chatsData.chatsInfo[currentChat].numDocs - chatsData.docNumber <=1){
//             if (containerRef.current && (containerRef.current.scrollHeight -containerRef.current.scrollTop - containerRef.current.clientHeight) <= 100 && (chatsData.numDocs - chatsData.docNumber)<=1){
//                 setStb(true)
//                 updateDisplayMessages(chatsData.numDocs, currentChat,chatsData.chatsInfo[currentChat].numDocs)
//             }
//             else{
//                 setNewContentAtBottom(true)
//                 if (chatsData.numDocs - chatsData.docNumber<=1){    
//                     const prev = containerRef.current.scrollTop
//                     await updateDisplayMessages(chatsData.docNumber, currentChat,chatsData.chatsInfo[currentChat].numDocs)
//                     containerRef.current.scrollTop = prev
//                 }
                
//             }
//         }
//         else{
//             setNewContentAtBottom(true)
//         }
//     }

//     if ((currentChat in chatsData.chatsInfo && chatsData.chatsInfo[currentChat].numDocs)){
//         helper()
//     }
//     else{
//         return
//     }

// }, [chatsData.reload[chatsData.currentChat]])