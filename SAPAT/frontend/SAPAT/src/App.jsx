'use client'

import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from '@liveblocks/react/suspense'
import { useParams } from 'react-router-dom'

import './i18n'; // initialize i18next
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  useLocation,
} from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Ingredients from './pages/Ingredients'
import Nutrients from './pages/Nutrients'
import Formulations from './pages/Formulations'
import ViewFormulationEntry from './pages/ViewFormulation/ViewFormulationEntry.jsx'
import ViewGroupFormulationEntry from './pages/ViewGroupFormulation/ViewGroupFormulationEntry.jsx'
import Error from './pages/Error'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Loading from './components/Loading'
import useAuth from './hook/useAuth.js'
import { LiveObject } from '@liveblocks/client'

function AppLayout() {
  const location = useLocation()
  const isAuthPage = location.pathname === '/'

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {!isAuthPage && <Header />}
      
      {/* On mobile: flex-col-reverse (Content on top, Sidebar/Nav on bottom)
        On desktop: flex-row (Sidebar on left, Content on right)
      */}
      <div className="flex flex-1 flex-col-reverse overflow-hidden md:flex-row sm:mx-0 mx-3">
        {!isAuthPage && <Sidebar />}
        
        <div className="flex-1 overflow-auto pb-16 md:pb-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function FormulationRoom() {
  const { id } = useParams()
  return (
    <RoomProvider
      id={`formulation-${id}`}
      initialPresence={{ focusedId: null }}
      initialStorage={{
        formulation: new LiveObject({
          code: '',
          name: '',
          description: '',
          animal_group: '',
          shadowPrices: [],
          nutrientsMenu: [],
          ingredientsMenu: [],
          nutrientRatioConstraints: [],
        }),
      }}
    >
      <ClientSideSuspense fallback={<Loading />}>
        {() => <ViewFormulationEntry id={id} />}
      </ClientSideSuspense>
    </RoomProvider>
  )
}
function GroupFormulationRoom() {
  const { id } = useParams()
  return (
    <RoomProvider
      id={`formulation-${id}`}
      initialPresence={{ focusedId: null }}
      initialStorage={{
        formulation: new LiveObject({
          code: '',
          name: '',
          description: '',
          animal_group: '',
          shadowPrices: [],
          nutrientsMenu: [],
          ingredientsMenu: [],
          nutrientRatioConstraints: [],
        }),
      }}
    >
      <ClientSideSuspense fallback={<Loading />}>
        {() => <ViewGroupFormulationEntry id={id} />}
      </ClientSideSuspense>
    </RoomProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: '/',
        element: <Login />,
      },
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/ingredients',
        element: <Ingredients />,
      },
      {
        path: '/nutrients',
        element: <Nutrients />,
      },
      {
        path: '/formulations',
        element: <Formulations />,
      },
      {
        path: '/formulations/:id',
        element: <FormulationRoom />,
      },

      {
        path: '/groupFormulations/:id',
        element: <GroupFormulationRoom />,
      },

      {
        path: '/error',
        element: <Error />,
      },
    ],
  },
])

function App() {
  const { liveblocksAuth } = useAuth(); // This is likely your URL string

  return (
    <I18nextProvider i18n={i18n}>
      <LiveblocksProvider 
        authEndpoint={async (room) => {
          // Manually calling fetch to include credentials
          const response = await fetch(liveblocksAuth, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ room }),
            // THIS IS THE CRITICAL LINE:
            credentials: "include", 
          });

          if (!response.ok) {
            throw new Error("Failed to authenticate Liveblocks session");
          }

          return await response.json();
        }}
      >
        <RouterProvider router={router} />
      </LiveblocksProvider>
    </I18nextProvider>
  )
}

export default App
