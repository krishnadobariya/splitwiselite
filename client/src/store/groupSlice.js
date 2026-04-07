import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const user = JSON.parse(localStorage.getItem('user'));

const initialState = {
  groups: [],
  currentGroup: null,
  balances: [],
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};

const getAuthHeader = (thunkAPI) => {
    const user = thunkAPI.getState().auth.user;
    if (user && user.token) {
        return { headers: { Authorization: `Bearer ${user.token}` } };
    }
    return {};
};

// Create new group
export const createGroup = createAsyncThunk(
  'groups/create',
  async (groupData, thunkAPI) => {
    try {
      const config = getAuthHeader(thunkAPI);
      const response = await axios.post('/api/groups', groupData, config);
      return response.data;
    } catch (error) {
      const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get all groups
export const getGroups = createAsyncThunk(
  'groups/getAll',
  async (_, thunkAPI) => {
    try {
      const config = getAuthHeader(thunkAPI);
      const response = await axios.get('/api/groups', config);
      return response.data;
    } catch (error) {
      const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get group by id
export const getGroupById = createAsyncThunk(
  'groups/getOne',
  async (groupId, thunkAPI) => {
    try {
      const config = getAuthHeader(thunkAPI);
      const response = await axios.get(`/api/groups/${groupId}`, config);
      return response.data;
    } catch (error) {
      const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Get group balances
export const getGroupBalances = createAsyncThunk(
  'groups/getBalances',
  async (groupId, thunkAPI) => {
    try {
      const config = getAuthHeader(thunkAPI);
      const response = await axios.get(`/api/expenses/${groupId}/balances`, config);
      return response.data;
    } catch (error) {
      const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Add member to group
export const addMember = createAsyncThunk(
  'groups/addMember',
  async ({ groupId, email }, thunkAPI) => {
    try {
      const config = getAuthHeader(thunkAPI);
      const response = await axios.post(`/api/groups/${groupId}/members`, { email }, config);
      return response.data;
    } catch (error) {
      const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update group
export const updateGroup = createAsyncThunk(
  'groups/update',
  async ({ groupId, groupData }, thunkAPI) => {
    try {
      const config = getAuthHeader(thunkAPI);
      const response = await axios.put(`/api/groups/${groupId}`, groupData, config);
      return response.data;
    } catch (error) {
      const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete group
export const deleteGroup = createAsyncThunk(
  'groups/delete',
  async (groupId, thunkAPI) => {
    try {
      const config = getAuthHeader(thunkAPI);
      const response = await axios.delete(`/api/groups/${groupId}`, config);
      return groupId;
    } catch (error) {
      const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update expense
export const updateExpense = createAsyncThunk(
  'expenses/update',
  async ({ expenseId, expenseData }, thunkAPI) => {
    try {
      const config = getAuthHeader(thunkAPI);
      const response = await axios.put(`/api/expenses/${expenseId}`, expenseData, config);
      return response.data;
    } catch (error) {
      const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete expense
export const deleteExpense = createAsyncThunk(
  'expenses/delete',
  async (expenseId, thunkAPI) => {
    try {
      const config = getAuthHeader(thunkAPI);
      await axios.delete(`/api/expenses/${expenseId}`, config);
      return expenseId;
    } catch (error) {
      const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Remove member from group
export const removeMember = createAsyncThunk(
  'groups/removeMember',
  async ({ groupId, memberId }, thunkAPI) => {
    try {
      const config = getAuthHeader(thunkAPI);
      const response = await axios.delete(`/api/groups/${groupId}/members/${memberId}`, config);
      return response.data;
    } catch (error) {
      const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

export const groupSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createGroup.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.groups.push(action.payload);
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(getGroups.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getGroups.fulfilled, (state, action) => {
        state.isLoading = false;
        state.groups = action.payload;
      })
      .addCase(getGroupById.fulfilled, (state, action) => {
        state.currentGroup = action.payload;
      })
      .addCase(getGroupBalances.fulfilled, (state, action) => {
        state.balances = action.payload;
      })
      .addCase(addMember.fulfilled, (state, action) => {
        state.currentGroup = action.payload;
      })
      .addCase(updateGroup.fulfilled, (state, action) => {
        state.currentGroup = action.payload;
        state.groups = state.groups.map(g => g._id === action.payload._id ? action.payload : g);
      })
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.groups = state.groups.filter(g => g._id !== action.payload);
      })
      .addCase(removeMember.fulfilled, (state, action) => {
        state.currentGroup = action.payload;
      });
  },
});

export const { reset } = groupSlice.actions;
export default groupSlice.reducer;
