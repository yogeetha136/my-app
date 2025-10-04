import React, { useState, useEffect, useMemo, createContext, useContext, useReducer, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { Loader, XCircle, Trash2, Edit2, Save, X, PlusCircle, Home, CheckCircle, Clock, Users, Zap, Calendar } from 'lucide-react';

// ==============================================================================
// 1. Configuration, Constants, and Mock API (Using LocalStorage)
// ==============================================================================

const MOCK_API_DELAY = 300;
const LS_KEY = 'familyTaskManagerTasks';
const LS_MEMBERS_KEY = 'familyTaskManagerMembers';

// Mock Initial Data
const initialFamilyMembers = [
    { name: 'Mom', points: 150, avatar: '👩' },
    { name: 'Dad', points: 100, avatar: '👨' },
    { name: 'Junior', points: 50, avatar: '👦' },
];

const mockInitialTasks = [
    { _id: "66f7d0a6c0b3d8a5e8f6e8c1", title: "Clean living room", assignedTo: "Mom", dueDate: "2025-10-10", priority: "High", points: 30, description: "Vacuum, dust, and tidy up the sofa.", status: "Pending", createdAt: Date.now(), updatedAt: Date.now() },
    { _id: "66f7d0a6c0b3d8a5e8f6e8c2", title: "Walk the dog", assignedTo: "Junior", dueDate: "2025-09-30", priority: "Medium", points: 10, description: "Morning walk before 8 AM.", status: "Completed", createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000 },
    { _id: "66f7d0a6c0b3d8a5e8f6e8c3", title: "Grocery shopping", assignedTo: "Dad", dueDate: "2025-10-05", priority: "High", points: 50, description: "Need milk, eggs, bread, and fruits.", status: "Pending", createdAt: Date.now() - 172800000, updatedAt: Date.now() - 172800000 },
    { _id: "66f7d0a6c0b3d8a5e8f6e8c4", title: "Mow the lawn", assignedTo: "Dad", dueDate: "2025-10-15", priority: "Low", points: 20, description: "Front and backyard.", status: "Pending", createdAt: Date.now(), updatedAt: Date.now() },
];

// Load from Local Storage or use initial mock data
const loadTasks = () => {
    try {
        const storedTasks = localStorage.getItem(LS_KEY);
        return storedTasks ? JSON.parse(storedTasks) : mockInitialTasks;
    } catch (error) {
        console.error("Error loading tasks from local storage:", error);
        return mockInitialTasks;
    }
};

const loadMembers = () => {
    try {
        const storedMembers = localStorage.getItem(LS_MEMBERS_KEY);
        return storedMembers ? JSON.parse(storedMembers) : initialFamilyMembers;
    } catch (error) {
        console.error("Error loading members from local storage:", error);
        return initialFamilyMembers;
    }
};

const saveTasks = (tasks) => {
    localStorage.setItem(LS_KEY, JSON.stringify(tasks));
};

const saveMembers = (members) => {
    localStorage.setItem(LS_MEMBERS_KEY, JSON.stringify(members));
};

const mockFetchTasks = () => new Promise(resolve => {
    setTimeout(() => resolve(loadTasks()), MOCK_API_DELAY);
});

const mockSaveTask = (taskData, tasks) => new Promise(resolve => {
    setTimeout(() => {
        const now = Date.now();
        if (taskData._id) {
            // Update existing task
            const updatedTasks = tasks.map(t =>
                t._id === taskData._id ? { ...t, ...taskData, updatedAt: now } : t
            );
            saveTasks(updatedTasks);
            resolve(updatedTasks.find(t => t._id === taskData._id));
        } else {
            // Add new task
            const newTask = {
                ...taskData,
                _id: crypto.randomUUID(),
                status: 'Pending',
                createdAt: now,
                updatedAt: now,
            };
            const newTasks = [newTask, ...tasks];
            saveTasks(newTasks);
            resolve(newTask);
        }
    }, MOCK_API_DELAY);
});

const mockDeleteTask = (id, tasks) => new Promise(resolve => {
    setTimeout(() => {
        const updatedTasks = tasks.filter(t => t._id !== id);
        saveTasks(updatedTasks);
        resolve({ success: true, id });
    }, MOCK_API_DELAY);
});

const mockCompleteTask = (id, tasks, members) => new Promise(resolve => {
    setTimeout(() => {
        const task = tasks.find(t => t._id === id);
        if (!task || task.status === 'Completed') {
            resolve(null);
            return;
        }

        const now = Date.now();
        const updatedTasks = tasks.map(t =>
            t._id === id ? { ...t, status: 'Completed', updatedAt: now, completedAt: now } : t
        );

        const memberIndex = members.findIndex(m => m.name === task.assignedTo);
        const updatedMembers = [...members];
        if (memberIndex !== -1) {
            updatedMembers[memberIndex] = {
                ...updatedMembers[memberIndex],
                points: updatedMembers[memberIndex].points + task.points,
            };
        }

        saveTasks(updatedTasks);
        saveMembers(updatedMembers);

        resolve({ task: updatedTasks.find(t => t._id === id), members: updatedMembers });

    }, MOCK_API_DELAY);
});


// ==============================================================================
// 2. Task Context and Provider (State Management)
// ==============================================================================

const TaskContext = createContext();

const taskReducer = (state, action) => {
    switch (action.type) {
        case 'SET_TASKS':
            return { ...state, tasks: action.payload, loading: false, error: null };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false };
        case 'SET_MEMBERS':
            return { ...state, familyMembers: action.payload };
        case 'TASK_UPDATED':
            return {
                ...state,
                tasks: state.tasks.map(t =>
                    t._id === action.payload._id ? action.payload : t
                ),
                loading: false,
            };
        case 'TASK_ADDED':
            return {
                ...state,
                tasks: [action.payload, ...state.tasks],
                loading: false,
            };
        case 'TASK_DELETED':
            return {
                ...state,
                tasks: state.tasks.filter(t => t._id !== action.payload),
                loading: false,
            };
        case 'TASK_COMPLETED':
            return {
                ...state,
                tasks: state.tasks.map(t =>
                    t._id === action.payload.task._id ? action.payload.task : t
                ),
                familyMembers: action.payload.members,
                loading: false,
            };
        default:
            return state;
    }
};

const TaskProvider = ({ children }) => {
    const [state, dispatch] = useReducer(taskReducer, {
        tasks: loadTasks(),
        familyMembers: loadMembers(),
        loading: true,
        error: null,
    });

    // Initial Fetch
    useEffect(() => {
        const fetchAllTasks = async () => {
            dispatch({ type: 'SET_LOADING', payload: true });
            try {
                const tasks = await mockFetchTasks();
                dispatch({ type: 'SET_TASKS', payload: tasks });
            } catch (err) {
                dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch tasks.' });
                console.error(err);
            }
        };
        fetchAllTasks();
    }, []);

    const saveTask = useCallback(async (taskData) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const result = await mockSaveTask(taskData, state.tasks);
            if (taskData._id) {
                dispatch({ type: 'TASK_UPDATED', payload: result });
            } else {
                dispatch({ type: 'TASK_ADDED', payload: result });
            }
            return result;
        } catch (err) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to save task.' });
            console.error(err);
        }
    }, [state.tasks]);

    const deleteTask = useCallback(async (id) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            await mockDeleteTask(id, state.tasks);
            dispatch({ type: 'TASK_DELETED', payload: id });
        } catch (err) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to delete task.' });
            console.error(err);
        }
    }, [state.tasks]);

    const completeTask = useCallback(async (id) => {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const result = await mockCompleteTask(id, state.tasks, state.familyMembers);
            if (result) {
                dispatch({ type: 'TASK_COMPLETED', payload: result });
            } else {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        } catch (err) {
            dispatch({ type: 'SET_ERROR', payload: 'Failed to complete task.' });
            console.error(err);
        }
    }, [state.tasks, state.familyMembers]);

    // Update Local Storage whenever tasks/members change
    useEffect(() => {
        saveTasks(state.tasks);
    }, [state.tasks]);

    useEffect(() => {
        saveMembers(state.familyMembers);
    }, [state.familyMembers]);

    const value = useMemo(() => ({
        ...state,
        saveTask,
        deleteTask,
        completeTask,
        getTaskById: (id) => state.tasks.find(t => t._id === id),
    }), [state, saveTask, deleteTask, completeTask]);

    return (
        <TaskContext.Provider value={value}>
            {children}
        </TaskContext.Provider>
    );
};

const useTasks = () => useContext(TaskContext);


// ==============================================================================
// 3. Components
// ==============================================================================

// --- Navbar Component ---
const Navbar = () => {
    const { familyMembers } = useTasks();
    const totalPoints = familyMembers.reduce((sum, member) => sum + member.points, 0);

    return (
        <header className="bg-white shadow-md sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold text-indigo-600 flex items-center">
                    <CheckCircle className="w-6 h-6 mr-2" /> Family Task Manager
                </Link>
                <div className="flex items-center space-x-6">
                    <div className="hidden sm:flex items-center text-gray-700 text-sm font-medium">
                        <Zap className="w-5 h-5 text-yellow-500 mr-1" />
                        Total Family Points: <span className="ml-1 font-bold text-lg text-yellow-600">{totalPoints}</span>
                    </div>
                    <Link
                        to="/add"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out flex items-center"
                    >
                        <PlusCircle className="w-5 h-5 mr-1" /> Add New Task
                    </Link>
                </div>
            </div>
        </header>
    );
};


// --- Stats Card Component ---
const StatsCard = ({ title, value, icon: Icon, color }) => (
    <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 border-${color}-500 transition-all hover:shadow-xl`}>
        <div className="flex items-center">
            <div className={`flex-shrink-0 p-3 rounded-full bg-${color}-100 text-${color}-600`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="ml-5">
                <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                <dd className="text-3xl font-extrabold text-gray-900 mt-1">{value}</dd>
            </div>
        </div>
    </div>
);


// --- Task Card Component ---
const TaskCard = ({ task }) => {
    const { completeTask, deleteTask, loading } = useTasks();
    const navigate = useNavigate();

    const isCompleted = task.status === 'Completed';

    const statusClasses = {
        'Pending': 'bg-red-50 text-red-700 border-red-500',
        'Completed': 'bg-green-50 text-green-700 border-green-500',
    };

    const handleComplete = (e) => {
        e.preventDefault();
        if (isCompleted || loading) return;
        completeTask(task._id);
    };

    const handleDelete = (e) => {
        e.preventDefault();
        if (loading) return;
        if (window.confirm(`Are you sure you want to delete the task: "${task.title}"?`)) {
            deleteTask(task._id);
        }
    };

    const handleEdit = (e) => {
        e.preventDefault();
        navigate(`/edit/${task._id}`);
    };

    return (
        <div className={`bg-white rounded-xl shadow-lg overflow-hidden border-t-4 ${statusClasses[task.status]} transform hover:scale-[1.01] transition duration-200`}>
            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-gray-900 truncate pr-4" title={task.title}>
                        {task.title}
                    </h3>
                    <div className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full uppercase ${statusClasses[task.status].replace('bg-', 'bg-').replace('text-', 'text-')}`}>
                        {isCompleted ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                        {task.status}
                    </div>
                </div>

                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{task.description}</p>

                <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-700">
                        <Users className="w-4 h-4 mr-2 text-indigo-500" />
                        <span className="font-semibold">Assigned:</span> {task.assignedTo}
                    </div>
                    <div className="flex items-center text-gray-700">
                        <Calendar className="w-4 h-4 mr-2 text-pink-500" />
                        <span className="font-semibold">Due Date:</span> {task.dueDate}
                    </div>
                    <div className="flex items-center text-gray-700">
                        <Zap className="w-4 h-4 mr-2 text-yellow-600" />
                        <span className="font-semibold">Points:</span> <span className="font-bold text-yellow-700">{task.points}</span>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 px-5 py-3 flex justify-end space-x-2 border-t">
                {!isCompleted && (
                    <button
                        onClick={handleComplete}
                        disabled={loading}
                        className="flex items-center text-sm font-medium text-green-600 hover:text-green-800 disabled:opacity-50 transition"
                        title="Mark as Complete"
                    >
                        <CheckCircle className="w-4 h-4 mr-1" /> Complete
                    </button>
                )}
                <button
                    onClick={handleEdit}
                    disabled={loading}
                    className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 transition"
                    title="Edit Task"
                >
                    <Edit2 className="w-4 h-4 mr-1" /> Edit
                </button>
                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex items-center text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50 transition"
                    title="Delete Task"
                >
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                </button>
            </div>
        </div>
    );
};


// --- Task Form Component ---
const TaskForm = ({ initialData, onSubmit, onCancel, isEdit = false }) => {
    const navigate = useNavigate();
    const { familyMembers, loading } = useTasks();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignedTo: familyMembers[0]?.name || '',
        dueDate: new Date().toISOString().split('T')[0],
        points: 10,
        priority: 'Medium',
        ...initialData
    });

    const isFormValid = formData.title && formData.assignedTo && formData.dueDate && formData.points > 0;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid || loading) return;
        await onSubmit(formData);
        navigate('/');
    };

    const priorities = ['Low', 'Medium', 'High'];

    return (
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-auto">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-6">{isEdit ? 'Edit Task' : 'Add New Task'}</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Title */}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Task Title</label>
                    <input
                        type="text"
                        name="title"
                        id="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                        placeholder="e.g., Clean the garage"
                    />
                </div>

                {/* Description */}
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                    <textarea
                        name="description"
                        id="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="3"
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                        placeholder="Details about the task..."
                    ></textarea>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    {/* Assigned To */}
                    <div>
                        <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700">Assigned To</label>
                        <select
                            name="assignedTo"
                            id="assignedTo"
                            value={formData.assignedTo}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                        >
                            {familyMembers.map(member => (
                                <option key={member.name} value={member.name}>{member.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Due Date */}
                    <div>
                        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">Due Date</label>
                        <input
                            type="date"
                            name="dueDate"
                            id="dueDate"
                            value={formData.dueDate}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    {/* Points */}
                    <div>
                        <label htmlFor="points" className="block text-sm font-medium text-gray-700">Points Value</label>
                        <input
                            type="number"
                            name="points"
                            id="points"
                            value={formData.points}
                            onChange={handleChange}
                            min="1"
                            required
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                        />
                    </div>

                    {/* Priority */}
                    <div>
                        <label htmlFor="priority" className="block text-sm font-medium text-gray-700">Priority</label>
                        <select
                            name="priority"
                            id="priority"
                            value={formData.priority}
                            onChange={handleChange}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                        >
                            {priorities.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        <X className="w-5 h-5 mr-1" /> Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!isFormValid || loading}
                        className="flex items-center justify-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader className="w-5 h-5 mr-2 animate-spin" /> : (isEdit ? <Save className="w-5 h-5 mr-2" /> : <PlusCircle className="w-5 h-5 mr-2" />)}
                        {isEdit ? 'Save Changes' : 'Create Task'}
                    </button>
                </div>
            </form>
        </div>
    );
};


// ==============================================================================
// 4. View Components (Pages)
// ==============================================================================

// --- Home View Component ---
const HomeView = () => {
    const { tasks, loading, error, familyMembers } = useTasks();
    const [statusFilter, setStatusFilter] = useState('All');
    const [assigneeFilter, setAssigneeFilter] = useState('All');

    // Stats Calculation
    const stats = useMemo(() => {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'Completed').length;
        const pending = total - completed;

        return [
            { title: 'Total Tasks', value: total, icon: Zap, color: 'indigo' },
            { title: 'Pending', value: pending, icon: Clock, color: 'red' },
            { title: 'Completed', value: completed, icon: CheckCircle, color: 'green' },
        ];
    }, [tasks]);

    // Filtering Logic
    const filteredTasks = useMemo(() => {
        let list = tasks;

        if (statusFilter !== 'All') {
            list = list.filter(t => t.status === statusFilter);
        }
        if (assigneeFilter !== 'All') {
            list = list.filter(t => t.assignedTo === assigneeFilter);
        }

        // Sort: Pending tasks first, then by due date
        list.sort((a, b) => {
            if (a.status === 'Pending' && b.status !== 'Pending') return -1;
            if (a.status !== 'Pending' && b.status === 'Pending') return 1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });

        return list;
    }, [tasks, statusFilter, assigneeFilter]);


    const assigneeOptions = useMemo(() => [
        'All',
        ...familyMembers.map(m => m.name)
    ], [familyMembers]);

    const statusOptions = ['All', 'Pending', 'Completed'];

    // Loading State
    if (loading && tasks.length === 0) {
        return (
            <div className="flex justify-center items-center p-12">
                <Loader className="w-10 h-10 animate-spin text-indigo-500" />
                <p className="ml-4 text-lg text-indigo-600">Loading tasks...</p>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="flex justify-center items-center p-12 bg-red-100 border border-red-400 rounded-lg max-w-lg mx-auto mt-10">
                <XCircle className="w-6 h-6 text-red-600 mr-3" />
                <p className="text-red-700 font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {stats.map(stat => (
                    <StatsCard key={stat.title} {...stat} />
                ))}
            </div>

            {/* Filter Section */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Filter Tasks</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Status Filter */}
                    <div>
                        <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            id="statusFilter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                        >
                            {statusOptions.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>

                    {/* Assignee Filter */}
                    <div>
                        <label htmlFor="assigneeFilter" className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                        <select
                            id="assigneeFilter"
                            value={assigneeFilter}
                            onChange={(e) => setAssigneeFilter(e.target.value)}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                        >
                            {assigneeOptions.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Task Grid */}
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Family Chore List ({filteredTasks.length} {filteredTasks.length === 1 ? 'Task' : 'Tasks'})</h2>

            {filteredTasks.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTasks.map(task => (
                        <TaskCard key={task._id} task={task} />
                    ))}
                </div>
            ) : (
                <div className="bg-white p-10 rounded-xl shadow-lg text-center">
                    <p className="text-xl text-gray-600 font-medium">No tasks match the current filters.</p>
                    <p className="text-gray-500 mt-2">Try adjusting the status or assignee filters.</p>
                </div>
            )}
        </div>
    );
};


// --- Add Task Page ---
const AddTaskPage = () => {
    const { saveTask, loading } = useTasks();
    const navigate = useNavigate();

    const handleSave = async (data) => {
        await saveTask(data);
        // navigate is called inside TaskForm after successful save
    };

    return (
        <div className="py-12 flex justify-center">
            <TaskForm
                onSubmit={handleSave}
                onCancel={() => navigate('/')}
                isEdit={false}
                key="add-form" // Key ensures re-render when navigating back
            />
        </div>
    );
};

// --- Edit Task Page ---
const EditTaskPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getTaskById, saveTask, loading } = useTasks();
    const task = getTaskById(id);

    const handleSave = async (data) => {
        await saveTask({ ...data, _id: id });
        // navigate is called inside TaskForm after successful save
    };

    if (loading) {
        return (
             <div className="flex justify-center items-center p-12">
                <Loader className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="text-center bg-red-100 p-6 rounded-lg border border-red-300">
                    <XCircle className="w-8 h-8 text-red-600 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-red-800">Task Not Found</h3>
                    <p className="text-red-700 mt-2">The task ID "{id}" does not exist.</p>
                    <Link to="/" className="mt-4 inline-block text-indigo-600 hover:text-indigo-800 font-medium">
                        Go back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="py-12 flex justify-center">
            <TaskForm
                initialData={task}
                onSubmit={handleSave}
                onCancel={() => navigate('/')}
                isEdit={true}
            />
        </div>
    );
};


// ==============================================================================
// 5. Main Application Component (Router)
// ==============================================================================

const App = () => {
    return (
        // HashRouter is used for simple client-side routing in single-page applications
        <Router>
            {/* The TaskProvider wraps the entire application to provide context */}
            <TaskProvider>
                <div className="min-h-screen bg-gray-50 font-sans antialiased">
                    <Navbar />

                    <main className="max-w-7xl mx-auto pb-12">
                        {/* Define the application routes */}
                        <Routes>
                            <Route path="/" element={<HomeView />} />
                            <Route path="/add" element={<AddTaskPage />} />
                            <Route path="/edit/:id" element={<EditTaskPage />} />
                            <Route path="*" element={<HomeView />} /> {/* Fallback to Home */}
                        </Routes>
                    </main>
                </div>
            </TaskProvider>
        </Router>
    );
};

export default App;
