import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import httpClient, { extractApiError } from "../api/httpClient";

export const login = createAsyncThunk("auth/login", async (payload, { rejectWithValue }) => {
  try { const res = await httpClient.post("/auth/login", payload); return res.data?.data; }
  catch (e) { return rejectWithValue(extractApiError(e)); }
});
export const getMe = createAsyncThunk("auth/me", async (_, { rejectWithValue }) => {
  try { const res = await httpClient.get("/auth/me"); return res.data?.data; }
  catch (e) { return rejectWithValue(extractApiError(e)); }
});
export const logoutAsync = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
  try { await httpClient.post("/auth/logout"); return true; } catch (e) { return rejectWithValue(extractApiError(e)); }
});

const slice = createSlice({
  name: "auth",
  initialState: { user: null, loading: false, error: null, initialized: false },
  reducers: {},
  extraReducers: (b) => b
    .addCase(login.pending, (s)=>{s.loading=true;s.error=null;})
    .addCase(login.fulfilled, (s,a)=>{s.loading=false;s.user=a.payload;})
    .addCase(login.rejected, (s,a)=>{s.loading=false;s.error=a.payload;})
    .addCase(getMe.fulfilled, (s,a)=>{s.user=a.payload;s.initialized=true;})
    .addCase(getMe.rejected, (s)=>{s.initialized=true;s.user=null;})
    .addCase(logoutAsync.fulfilled, (s)=>{s.user=null;})
});
export default slice.reducer;
