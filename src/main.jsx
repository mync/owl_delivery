import ReactDOM from 'react-dom/client'
import './index.css'
import Home from './Home'
import { ChatContextProvider } from "./context/ChatContext";
import { AuthContextProvider } from './context/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
    <AuthContextProvider>
    <ChatContextProvider>
        <Home />
    </ChatContextProvider>
    </AuthContextProvider>
)










