import { useContext, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import PropTypes from 'prop-types';

const Message = ({ message }) => {

  const { currentUser } = useContext(AuthContext);
  const { chatsData } = useContext(ChatContext);

  function getFormattedDate(date) {
    date = new Date(date.seconds * 1000 + date.nanoseconds / 1000000);

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
    
    return `${hour}:${minutes} ${day}, ${dateNum} ${month}, ${year}`;
}

  const date = getFormattedDate(message.time)
  const hourAndMinute = date.slice(0, 5);

  const ref = useRef();
  message.message = message.message.replace(/\s+/g, ' ').trim();
 
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [message]);

  if (message.type=='system'){
    return (
        <div className="flex flex-col w-[100%] items-center justify-center " id={message.id}>
            <div className="group flex-col">
                <div className="bg-orange-200 rounded shadow p-1"> {message.message} </div> 
            </div>
        </div>
    )
  }

  if (message.type=='chatMessage' && message.author==currentUser){
    return (
        <div className="flex flex-col w-[100%] items-end " id={message.id}>
            <div className="group flex flex-row px-3 py-2  gap-2 w-[100%] justify-end">
                <div className="flex text-xs  justify-center items-center font-sans text-transparent group-hover:text-black transition-linear duration-200" >{hourAndMinute}</div>
                <div className="flex min-w-[10%] break-custom bg-orange-200 rounded shadow p-1 max-w-[80%] justify-center"> {message.message} </div> 
            </div>
        </div>
    )
  }

  if (message.type=='chatMessage'){
    return (
        <div className="flex flex-col w-[100%] items-start " id={message.id}>
            <div className="group flex flex-row px-3 py-2  gap-2 w-[100%]">
                <div className="flex min-w-[10%] break-custom bg-orange-200 rounded shadow p-1 max-w-[80%] justify-center">{message.message}</div>
                <div className="flex text-xs justify-center items-center font-sans text-transparent group-hover:text-black transition-linear duration-200" >{hourAndMinute}</div>
            </div>
        </div>
    )
  }

  return (<></>);
};

Message.propTypes = {
    message: PropTypes.object.isRequired,
  };

  
export default Message;