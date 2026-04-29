import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import httpClient, { extractApiError } from "../api/httpClient";

export const createCrudSlice = ({ name, endpoint }) => {
  const fetchList = createAsyncThunk(`${name}/fetchList`, async (params = {}, { rejectWithValue }) => {
    try {
      const res = await httpClient.get(endpoint, { params });
      return { data: res.data?.data || [], meta: res.data?.meta || {} };
    } catch (e) { return rejectWithValue(extractApiError(e)); }
  });
  const initialState = { items: [], meta: {}, loading: false, error: null, success: null };
  const slice = createSlice({
    name, initialState,
    reducers: { resetState: () => initialState },
    extraReducers: (b) => b
      .addCase(fetchList.pending, (s)=>{s.loading=true;s.error=null;})
      .addCase(fetchList.fulfilled, (s,a)=>{s.loading=false;s.items=a.payload.data;s.meta=a.payload.meta;})
      .addCase(fetchList.rejected, (s,a)=>{s.loading=false;s.error=a.payload;})
  });
  return { reducer: slice.reducer, actions: slice.actions, fetchList };
};
