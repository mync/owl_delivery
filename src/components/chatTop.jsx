import { React, useContext } from "react";
import {ChatContext} from "../context/ChatContext"
import owl from '../assets/owl.jpg'
import {RiFolderTransferFill} from "react-icons/ri"
import {BsChatDotsFill} from "react-icons/bs"

import useLocalStorage from "../hooks/useLocalStorage";

const ChatTop = () =>{
    
    const {chatsData, dispatch} = useContext(ChatContext);
    function changeMode(){
        dispatch({type: 'mode_changed'})
    }

    return(
        <div className="flex bg-gray-700 w-[100%] h-[52px] felx-row items-center px-3 space-between justify-between">
            <div className="flex flex-row gap-3">            
                <img className = 'flex h-[35px] w-[35px] rounded-full' src={owl} />
                <span className=" flex text-[19px] font-medium pb-1 text-gray-100 ">{chatsData.otherUserName}</span>        
            </div>
            {   chatsData.chatting? 
                <RiFolderTransferFill className="text-white mx-2 hover:cursor-pointer" size="36" onClick = {changeMode}/> :
                <BsChatDotsFill className="text-white mx-2 hover:cursor-pointer" size="32" onClick = {changeMode}/> 
            }
        </div>
    )
}

export default ChatTop;
