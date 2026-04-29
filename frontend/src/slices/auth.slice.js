import { createSlice } from "@reduxjs/toolkit";
const slice=createSlice({name:"auth",initialState:{user:null},reducers:{setUser:(s,a)=>{s.user=a.payload;},logout:(s)=>{s.user=null;}}});
export const { setUser, logout } = slice.actions; export default slice.reducer;
