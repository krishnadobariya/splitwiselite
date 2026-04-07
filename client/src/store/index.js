import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import groupReducer from './groupSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    groups: groupReducer,
  },
});
