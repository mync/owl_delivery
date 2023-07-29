import {useContext, useState, useRef, useEffect} from "react"
import { ChatContext } from "../context/ChatContext";
import {BsImage} from "react-icons/bs"
import {IoSend} from "react-icons/io5"
import {doc, getDoc, setDoc, updateDoc, arrayUnion} from "firebase/firestore"
import { db } from "../firebase";
import { AuthContext } from "../context/AuthContext";
import { v4 as uuid } from "uuid";

function Input () {

    const {chatsData, dispatch} = useContext(ChatContext)
    const {currentUser} = useContext(AuthContext)

    const [text, setText] = useState("");
    const [displayText, setDisplayText] = useState("");
    const [img, setImg] = useState(null);
    const [textArrays, setTextArrays] = useState(['']);
    const [breakPoints, setBreakPoints] = useState([]);
    const inputRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(()=>{
        setText('');
        setDisplayText('');
    },[chatsData.currentUser])

    async function handleSend(){
        if (displayText.trimEnd()=='') return 
        const timeStamp = new Date();
        const chatId = chatsData.currentChat ;
        var docNumber = chatsData.chatsInfo[chatId].numDocs;

        const al = chatsData.messages[chatId][docNumber].length;
        const lastTimeStamp = chatsData.messages[chatId][docNumber][al-1].time
        const lastDate = new Date(lastTimeStamp.seconds * 1000 + lastTimeStamp.nanoseconds / 1000000);
       
        function compareDates(date1, date2) {
            const d1 = new Date(date1);
            const d2 = new Date(date2);
          
            d1.setHours(0, 0, 0, 0);
            d2.setHours(0, 0, 0, 0);
          
            return d1.getTime() === d2.getTime();
          }

        function getFormattedDate(date) {
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            
            const day = daysOfWeek[date.getDay()];
            const dateNum = date.getDate();
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            
            return `${day}, ${dateNum} ${month}, ${year}`;
        }

        const chatRef = await doc(db,'chats',chatId)
        if (al >= 15){
             docNumber+=1
             await updateDoc(chatRef, {numDocs:docNumber})
             chatsData.chatsInfo[chatId].numDocs = docNumber;
             await setDoc(await doc(chatRef, 'messages',String(docNumber)), {array:[]})
        }
        
        let toSend = {time: timeStamp, message: text, author: currentUser, type:'chatMessage', id:uuid()};
        const docRef = await doc(chatRef, 'messages',String(docNumber))
        if (!compareDates(lastDate, timeStamp)){
            await updateDoc(docRef, {array: arrayUnion(toSend)})
        }
        
        
        await updateDoc(docRef, {array: arrayUnion(toSend)})
        const currentUserDashed = currentUser.replace('.','-')
        await updateDoc(await doc(db,'notifications', chatsData.otherUserEmail), { [currentUserDashed] : [{message:'message',info:docNumber, time: toSend.time}] })
        dispatch({type:'message_sent', info:docNumber})
        
        const timeMili = toSend.time.getTime()
        const seconds = Math.floor(timeMili / 1000);
        const nanoseconds = (timeMili % 1000) * 1e6;
        toSend = {...toSend, time: {nanoseconds:nanoseconds, seconds}}
        if (docNumber in chatsData.messages[chatId])
            chatsData.messages[chatId][docNumber] = [...chatsData.messages[chatId][docNumber],toSend];
        else
            chatsData.messages[chatId][docNumber] = [toSend];
        chatsData.lastMessages = {...chatsData.lastMessages, [chatId] : toSend };
        setText(''); 
        setDisplayText('');
    }

    function handleChange(e){
        console.log(e)   
    }

    function handleKeyPress(e){
        if (e.key==='Backspace'){
            if (textArrays[textArrays.length-1] == '') {
                if (textArrays.length<=5){
                inputRef.current.className = inputRef.current.className.replace('h-[90px]','h-[60px]');
                inputRef.current.className = inputRef.current.className.replace('h-[120px]','h-[90px]');
                inputRef.current.className = inputRef.current.className.replace('h-[150px]','h-[120px]');
                inputRef.current.className = inputRef.current.className.replace('h-[180px]','h-[150px]');
                }
                if (textArrays.length>1){
                    textArrays.pop()
                }
            }
            else{
                textArrays[textArrays.length-1] = textArrays[textArrays.length-1].slice(0, -1);
            }

        }
        else if (e.key === 'Enter') {
            if (e.ctrlKey){
                handleSend()
            }
            else{
                textArrays.push('')
                inputRef.current.className = inputRef.current.className.replace('h-[150px]','h-[180px]');
                inputRef.current.className = inputRef.current.className.replace('h-[120px]','h-[150px]');
                inputRef.current.className = inputRef.current.className.replace('h-[90px]','h-[120px]');
                inputRef.current.className = inputRef.current.className.replace('h-[60px]','h-[90px]');
            }
        }
        else{
            if (e.keyCode >= 32 && e.keyCode <= 126) {
                textArrays[textArrays.length-1] += e.key 
            }
        }
        console.log(textArrays)

    }

    function sendImage(){

    }

    return (
            <div className='flex w-[100%] items-center justify-center pb-1'>
                <div ref={inputRef} className="h-[60px] bg-gray-50 rounded-2xl border-purple-300 border-2 w-[95%] flex flex-row  items-center px-3 gap-3 pb-1">
                    <input type="file" style={{ display: "none" }} id="file" onChange={(e) => setImg(e.target.files[0])}/>
                    <label htmlFor="file">
                    <BsImage className="hover: cursor-pointer w-[25px] h-[30px]" onClick={sendImage} />
                    </label>
                    < textarea ref={textareaRef} className="break-words p-3 h-[90%] w-[90%] focus:outline-none resize-none bg-transparent" placeholder="Send a Message"
                    value = {displayText} onChange={(e)=>{setText(e.target.value); setDisplayText(e.target.value); handleChange(e);}}
                     onKeyDown = {(e)=>handleKeyPress(e)}/>
                    <IoSend className="hover: cursor-pointer w-[25px] h-[30px] text-blue-600" onClick={handleSend}/>
                </div>
            </div>
    );
}

export default Input;