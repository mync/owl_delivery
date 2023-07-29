import React, { useState } from "react";
import Add from "./assets/addAvatar.png";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, storage } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {

  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fname, setFname] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    
    setLoading(true);
    e.preventDefault();
    
    const name = e.target[0].value;
    const email = e.target[1].value;
    const password = e.target[2].value;
    const confirmPassword = e.target[3].value;
    const file = e.target[4].files[0];
    
    if (password!=confirmPassword){
      setErr('passwords do not match')
      e.target[2].value = ''
      e.target[3].value = ''
      return 
    }
    try {

      const res = await createUserWithEmailAndPassword(auth, email, password);
      const storageRef = ref(storage, 'profilePics/'+email);
      if (fname){
        await uploadBytesResumable(storageRef, file).then(() => {
          getDownloadURL(storageRef).then(async (downloadURL) => {
            try {
              await setDoc(doc(db, "users", res.user.email), {
                uid: res.user.uid,
                name : name,
                email : email,
                photoURL: downloadURL,
                chats: []
              });
              
              await setDoc(doc(db,"notifications",res.user.email),{})

              navigate("/");
            } catch (err) {
              console.log(err);
              setErr(err.message);
              setLoading(false);
            }
          });
        });
      }
      else{
        try {
          await setDoc(doc(db, "users", res.user.email), {
            uid: res.user.uid,
            name: name,
            email: email,
            photoURL: '',
            chats: []
          });
          
          await setDoc(doc(db,"notifications",res.user.email),{})

          navigate("/");
        } catch (err) {
          console.log(err);
          setErr(err.message);
          setLoading(false);
        }
      }
    } catch (err) {
      setErr(err.message);
      setLoading(false);
    }

  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-200 w-[100%] h-[100%]">
      <div className="flex flex-col h-[93%] w-[100%] items-center justify-center ">
        <span className="text-xl text-gray-500 mt-1">Register</span>
        <form onSubmit={handleSubmit}  className="flex flex-col mt-4 gap-[5px]">
          <input className="w-[250px] h-[40px] rounded-[7px] mb-1 text-[14px] placeholder-gray-600 shadow pl-2" required type="text" placeholder="Enter name" />
          <input className="w-[250px] h-[40px] rounded-[7px] mb-1 text-[14px] placeholder-gray-600 shadow pl-2" required type="email" placeholder="Email" />
          <input className="w-[250px] h-[40px] rounded-[7px] mb-1 text-[14px] placeholder-gray-600 shadow pl-2" required type="password" placeholder= "Password" />
          <input className="w-[250px] h-[40px] rounded-[7px] mb-1 text-[14px] placeholder-gray-600 shadow pl-2" required type="password" placeholder= "Confirm password" />
          <input className="w-[250px] h-[40px] rounded-[7px] mb-1 text-[14px] placeholder-gray-600 shadow" style={{ display: "none" }} type="file" id="file" name='file' onChange={(e)=> setFname(e.target.files[0].name)}/>
          <label htmlFor="file" className=" mt-1 flex felx-row hover:cursor-pointer w-[225px] h-[30px] overflow-hidden">
            <img className = "w-[30px] h-[30px]" src={Add} alt="" />
            <span className="text-xs pt-[10px] pl-2">{fname? fname: 'Add an avatar'}</span>
          </label>
          {fname? <div onClick = {()=>setFname('')} className='text-xs p-2 text-gray-600 hover:cursor-pointer'>remove file</div> : ''}
          {err && <span className=" my-1 w-[250px] text-xs bg-red-200 p-2">{err}</span>}
          <button className="bg-red-400 w-[250px] h-[40px] rounded-[7px] mt-2 shadow-md hover:bg-blue-400 transition-all duration-300" disabled={loading}>Sign up</button>
        </form>

        <div className="text-xs pt-12 ">Already have an account? <Link to="/login"><span className="text-blue-400">Login</span></Link></div>
      
      </div>
    </div>
  );
};

export default Register;