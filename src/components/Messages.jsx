import { useContext, useEffect, useState, useRef, useCallback } from "react"
import { ChatContext } from "../context/ChatContext"
import { AuthContext } from "../context/AuthContext"
import {doc, getDoc} from "firebase/firestore"
import { db } from "../firebase"
import Message from "./Message"
import {BsFillArrowDownCircleFill} from "react-icons/bs"
import PropTypes from 'prop-types';

function Messages ({chatId}) {

    const {chatsData, dispatch} = useContext(ChatContext)
    const [displayMessages0, setDisplayMessages0] = useState([])
    const [displayMessages1, setDisplayMessages1] = useState([])
    const [displayMessages2, setDisplayMessages2] = useState([])
    const [newContentAtBottom, setNewContentAtBottom] = useState(false)
    const [atBottom, setAtBottom] = useState(true)
    const [stb, setStb] = useState(false)
    const [scroll, setScroll] = useState('')
    const containerRef = useRef(null);
    const page0Ref = useRef(null);
    const page1Ref = useRef(null);
    const page2Ref = useRef(null);

    useEffect(()=>{
        
        if (stb){scrollToBottom(); setStb(false); console.log('scrolled to bottom') }
        if (scroll == 'decreased'){
            const h0 = page0Ref.current.scrollHeight
            containerRef.current.scrollTop = h0 - 50
            setScroll('')
        }
        if (scroll == 'increased'){
            var h = page0Ref.current.scrollHeight + page1Ref.current.scrollHeight
            containerRef.current.scrollTop = h - containerRef.current.clientHeight + 50
            console.log('scroll top set to!',h - containerRef.current.clientHeight + 50)
            setScroll('')
        }
    },[displayMessages1])

    function scrollToBottom() {

        const helper = () => {
            if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
        };
        chatsData.docNumber = chatsData.chatsInfo[chatsData.currentChat].numDocs
        setTimeout(helper, 0);
    }

    function scrollToEnd(){
        setStb(true)
        setNewContentAtBottom(false)
        setAtBottom(true)
        chatsData.docNumber = chatsData.numDocs
        updateDisplayMessages(chatsData.numDocs,chatsData.currentChat,chatsData.numDocs)
    }

    function updateDisplayMessages(docNumberInteral , currentChatInteral, numDocsInternal ){
        if (currentChatInteral!=chatsData.currentChat) return 

        console.log("updating display ",currentChatInteral, docNumberInteral, ' ',currentChatInteral)
        
        async function setDisplay(){
            if (currentChatInteral!=chatsData.currentChat) return 
            
            async function getMessageArray(docNumberInteral, currentChatInteral){
                if (currentChatInteral in chatsData.messages && docNumberInteral in chatsData.messages[currentChatInteral]){
                    console.log('getting ',currentChatInteral,' ',docNumberInteral, ' from RAM')
                    const messageArray = await chatsData.messages[currentChatInteral][docNumberInteral]
                    return messageArray
                }
                else{
                    console.log('getting ',currentChatInteral,' ',docNumberInteral, ' from firestore')
                    const messageDoc = await getDoc(await doc(db,'chats/'+currentChatInteral+'/messages', String(docNumberInteral)))
                    const messagesArray = messageDoc.data().array
                    if (! (currentChatInteral in chatsData.messages)) { chatsData.messages[currentChatInteral] = {} } 
                    chatsData.messages[currentChatInteral][docNumberInteral] = messagesArray
                    return messagesArray
                }
            }
            
            console.log("setting display for number",docNumberInteral," chat ",currentChatInteral);
            const messageArray1 = await getMessageArray(docNumberInteral, currentChatInteral);
            
            
            if (numDocsInternal>docNumberInteral){
                const messageArray2 = await getMessageArray(docNumberInteral+1,currentChatInteral);
                await setDisplayMessages2(messageArray2);
            }
            else{
                setDisplayMessages2([]);
            }
            
            if (docNumberInteral>1){
                const messageArray0 = await getMessageArray(docNumberInteral-1, currentChatInteral);
                await setDisplayMessages0(messageArray0);
            }
            else{
                setDisplayMessages0([]);
            }

            await setDisplayMessages1([...messageArray1]) ;

        }
        setDisplay();
    }

    async function changeDocNumber(increase = false){

        if (increase){
            console.log('increasing ',chatsData.docNumber, ' to ',chatsData.docNumber+1, 'no of docs is ',chatsData.numDocs)
            if (chatsData.docNumber>=chatsData.numDocs) return
            setScroll('increased') 
            updateDisplayMessages(chatsData.docNumber+1, chatsData.currentChat, chatsData.numDocs)
            chatsData.docNumber+=1

        }
        else{
            console.log('decreasing ',chatsData.docNumber, ' to ',chatsData.docNumber-1)
            if (chatsData.docNumber<=1) return 
            setScroll('decreased') 
            updateDisplayMessages(chatsData.docNumber-1,chatsData.currentChat, chatsData.numDocs)
            chatsData.docNumber-=1
        }
    }

    // handling scrolling
    useEffect(() => {
    const handleScroll = () => {
        
        const container = containerRef.current;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollTop+clientHeight <= scrollHeight-100){setAtBottom(false)}
            else if(chatsData.numDocs == chatsData.docNumber) {setAtBottom(true); setNewContentAtBottom(false);}
            if (scrollTop === 0 && scrollHeight>clientHeight) {
                changeDocNumber(false)
            }
            if (scrollHeight -scrollTop - clientHeight< 1 && scrollHeight>clientHeight) {
                changeDocNumber(true)
            }
        }
    }; 

        const container = containerRef.current;
        if (container) {
          container.addEventListener('scroll', handleScroll);
        }

        return () => {
          if (container) {
            container.removeEventListener('scroll', handleScroll);
          }

        };
    }, [chatsData.docNumber, chatsData.numDocs]); 

    // on chat changed
    useEffect(()=>{
        const currentChat = chatsData.currentChat;
        
        async function helper(){
            if (currentChat in chatsData.chatsInfo && chatsData.chatsInfo[currentChat].numDocs){
                console.log('chat changed, updating display, setting num of document in messages and doc Number', chatsData.currentChat,chatsData.chatsInfo[currentChat].numDocs )
                chatsData.numDocs = chatsData.chatsInfo[currentChat].numDocs; 
                chatsData.docNumber = chatsData.chatsInfo[currentChat].numDocs;     
                dispatch({type:'messages_read', chatId:currentChat, otherUser: chatsData.otherUserEmail})
                await updateDisplayMessages(chatsData.chatsInfo[currentChat].numDocs, currentChat,chatsData.chatsInfo[currentChat].numDocs);
                setStb(true)
            }
            else{
                console.log('not loaded!')
                setTimeout(helper, 20)
            }
        }
        setTimeout(helper,10)

    },[chatsData.currentChat])

    // reloading
    useEffect(()=>{
        const currentChat = chatsData.currentChat

        async function helper(){

            const latestNumDocs = chatsData.chatsInfo[currentChat].numDocs
            chatsData.numDocs = latestNumDocs;

            if(chatsData.chatsInfo[currentChat].numDocs - chatsData.docNumber <=1){
                if (containerRef.current && (containerRef.current.scrollHeight -containerRef.current.scrollTop - containerRef.current.clientHeight) <= 100 && (chatsData.numDocs - chatsData.docNumber)<=1){
                    setStb(true)
                    updateDisplayMessages(chatsData.numDocs, currentChat,chatsData.chatsInfo[currentChat].numDocs)
                }
                else{
                    setNewContentAtBottom(true)
                    if (chatsData.numDocs - chatsData.docNumber<=1){    
                        const prev = containerRef.current.scrollTop
                        await updateDisplayMessages(chatsData.docNumber, currentChat,chatsData.chatsInfo[currentChat].numDocs)
                        containerRef.current.scrollTop = prev
                    }
                    
                }
            }
            else{
                setNewContentAtBottom(true)
            }
        }

        if ((currentChat in chatsData.chatsInfo && chatsData.chatsInfo[currentChat].numDocs)){
            helper()
        }
        else{
            return
        }

    }, [chatsData.reload[chatsData.currentChat]])
    

    return (
        <div className="flex flex-grow bg-yellow w-[100%] items-end pt-2 overflow-y-scroll">

            {newContentAtBottom?
                <div className="h-[100%]">
                    <div className="h-[90%]"></div>
                    <div className="fixed flex z-10 mx-3 bg-transparent">
                        <span className="text-blue-300 text-[32px] animate-bounce hover:cursor-pointer" onClick={scrollToEnd}> <BsFillArrowDownCircleFill/> </span>
                    </div> 
                </div>
            : ''}
            { !atBottom && !newContentAtBottom? 
                <div className="h-[100%]">
                    <div className="h-[90%]"></div>
                    <div className="fixed flex z-10 mx-3 bg-transparent">
                        <span className="text-blue-300 text-[32px] hover:cursor-pointer" onClick={scrollToEnd}> <BsFillArrowDownCircleFill/> </span>
                    </div> 
                </div> 
                : ''
              } 
            <div ref={containerRef} className="flex flex-col  h-[100%] w-[100%] bg-yellow-100 overflow-auto ">
                <div ref = {page0Ref}>
                    {displayMessages0.map((m,index) => (
                        <Message message={m} key={m.id} id={m.id}/>
                    ))}
                </div>
                <div ref = {page1Ref}>
                    {displayMessages1.map((m,index) => (
                        <Message message={m} key={m.id} id={m.id}/>
                    ))}
                </div>
                <div ref = {page2Ref}>
                    {displayMessages2.map((m,index) => (
                        <Message message={m} key={m.id} id={m.id}/>
                    ))}
                </div>
            </div>            
        </div>
    )
}

Messages.propTypes = {
    chatId: PropTypes.string.isRequired,
};

export default Messages