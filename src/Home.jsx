import React from 'react'
import { BrowserRouter, Routes, Route} from "react-router-dom";
import { useAuthState } from 'react-firebase-hooks/auth';
import {auth} from './firebase.js'
import Login from './Login'
import Register from './Register'
import Sidebar from './Sidebar'
import Chat from './Chat.jsx'

function Home() {
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          <Route index element={useAuthState(auth)[0]? 
            <div className='flex flex-row w-[100%] h-[100vh] bg-gray-50'>
              <Sidebar/>
              <Chat/>
            </div>   
            : <Login/>} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>
      </Routes>
    </BrowserRouter>



  )
}

export default Home
