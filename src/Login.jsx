import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

const Login = () => {
  const [err, setErr] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/")
    } catch (err) {
      setErr(err.message);
    }
  };
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-200 w-[100%] h-[100%]">
        <div className="flex flex-col h-[93%] w-[100%] items-center justify-center ">
            <span className="text-xl text-gray-500 mt-1">Login</span>
            <form onSubmit={handleSubmit} className="flex flex-col mt-4">
            <input required className = 'pl-3 w-[250px] h-[40px] rounded-[7px] mb-2 text-[14px] placeholder-gray-600 shadow' type="email" placeholder="Enter email" />
            <input required className = 'pl-3 w-[250px] h-[40px] rounded-[7px] mb-3 text-[14px] placeholder-gray-600 shadow' type="password" placeholder="Password" />
            {err && <span className=" my-1 w-[250px] text-xs bg-red-200 p-2">Something went wrong {err}</span>}
            <button className="bg-blue-400 w-[250px] h-[40px] rounded-[7px] mt-2 shadow-md hover:bg-red-400 transition-all duration-300">Sign in</button>
            </form>

            <div className="text-xs p-12">Need an account? <Link to="/register"><span className="text-blue-400">Register now</span></Link></div>
        </div>
    </div>
  );
};

export default Login;