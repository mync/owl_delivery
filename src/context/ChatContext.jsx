import { createContext, useReducer} from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import {doc, updateDoc} from "firebase/firestore"
import PropTypes from 'prop-types';

export const ChatContext = createContext();
  
export const ChatContextProvider = ({ children }) => {
    
    const currentUser  = useAuthState(auth)[0]
    
    const INITIAL_STATE = {
      chats: [],
      chatsInfo: {},
      currentChat: "",
      otherUserEmail: '',
      otherUserName: '',
      otherUserPhotoURL: '',
      chatting: true,
      allUsers : new Set([]),
      messages : {},
      reload: {},
      docNumber : 1,
      numDocs : 1,
      lastMessages : {},
      unread : {},
      reloadChatsDisplay : false,
    };
  
    const chatReducer = (state, action) => {

      switch (action.type) {

        case "user_changed":{
          const chatId = currentUser.email <= action.otherUserEmail
          ? currentUser.email +'#'+action.otherUserEmail
          : action.otherUserEmail +'#'+currentUser.email;
          return {
            ...state, 
            otherUserEmail: action.otherUserEmail,
            otherUserName: action.otherUserName,
            otherUserPhotoURL: action.otherUserPhotoURL,
            currentChat: chatId,
          };
        }

        case "chat_list_updated": {
          const newAllUsers = new Set([]);
          const newChatsInfo = {};
          const  newReload = {};
          action.chats.map((item) => {
            const email = item.email;
            newAllUsers.add(email);
            newChatsInfo[item.chatId] = item;
            newReload[item.chatId] = false;
            state.reload[item.chatId] = false;
            if (!(item.chatId in state.unread)){ 
              state.unread[item.chatId] = 0;
              state.lastMessages[item.chatId] = ''
            } 
          });
          return {
            ...state,
            allUsers: newAllUsers,
            chats: action.chats,
            chatsInfo: newChatsInfo,
          };

        }

        case "mode_changed":{
          return {
            ...state,
            chatting: !state.chatting
          };
        }
        case "message_sent":{           
          if (state.chatsInfo[state.currentChat].numDocs!=action.info){
            state.chatsInfo[state.currentChat].numDocs = action.info
          }
          state.reload[state.currentChat] = !state.reload[state.currentChat]
          return {
            ...state,
          };
        }

        case "notifcation":{

          let from = action.from;
          from = from.replace('-','.')
          const notiarray = action.notificationArray;
          const chatId = currentUser.email <= from
          ? currentUser.email +'#'+from
          : from+'#'+currentUser.email;


          let docNumber;
          notiarray.forEach(element => {  
            if (element.message == 'message'){
              docNumber = element.info;
              state.chatsInfo[chatId].numDocs = docNumber;
            }
          });
          
          const msgArray = state.messages[chatId][docNumber]
          state.lastMessages[chatId] = msgArray[msgArray.length-1];
          state.unread[chatId] = notiarray.length;
          state.reload[chatId] = !state.reload[chatId]
          state.reloadChatsDisplay = !state.reloadChatsDisplay
          return {
            ...state,
          };
        }

        case "last_messages_updated":{
          console.log('last messages updated')
          return {...state, lastMessages: action.lastMessages}
        }
        case "increase_docNumber":
          return {...state, docNumber: state.docNumber+1}
        case "decrease_docNumber":
          return {...state, docNumber: state.docNumber-1}

        case "messages_read": {
          state.unread[action.chatId] = 0
          console.log(currentUser.email)
          updateDoc(doc(db, 'notifications', currentUser.email), {[action.otherUser] : []})
          state.reloadChatsDisplay = !state.reloadChatsDisplay
          return state
        }

        default:
          return state;
      }
    };
  
    const [state, dispatch] = useReducer(chatReducer, INITIAL_STATE);
  
    return (
      <ChatContext.Provider value={{ chatsData:state, dispatch }}>
        {children}
      </ChatContext.Provider>
    );
  };

ChatContextProvider.propTypes = {
    children: PropTypes.node.isRequired
};
  