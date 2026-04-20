'use client'

import React, { useMemo } from 'react';
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from '@liveblocks/react/suspense'
import { useParams, createBrowserRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom'
import { LiveObject } from '@liveblocks/client'
import { I18nextProvider } from 'react-i18next';

import i18n from './i18n';
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Ingredients from './pages/Ingredients'
import Nutrients from './pages/Nutrients'
import Formulations from './pages/Formulations'
import ViewFormulationEntry from './pages/ViewFormulation/ViewFormulationEntry.jsx'
import ViewGroupFormulationEntry from './pages/ViewGroupFormulation/ViewGroupFormulationEntry.jsx'
import ErrorPage from './pages/Error' 
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Loading from './components/Loading'
import useAuth from './hook/useAuth.js'

/**
 * The Wrapper now handles both: 
 * 1. If liveblocksAuth is a URL (string)
 * 2. If liveblocksAuth is a function (which is what your hook is providing)
 */
function LiveblocksWrapper({ children }) {
  const { liveblocksAuth } = useAuth();

  const authStrategy = useMemo(() => {
    // If it's already a function (as seen in your console log), use it directly!
    if (typeof liveblocksAuth === 'function') {
      return liveblocksAuth;
    }

    // If it's a string, we build the fetcher logic
    if (typeof liveblocksAuth === 'string' && liveblocksAuth.length > 0) {
      return async (room) => {
        const response = await fetch(liveblocksAuth, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room }),
          credentials: "include",
        });
        if (!response.ok) throw new globalThis.Error("Auth failed");
        return await response.json();
      };
    }

    return null;
  }, [liveblocksAuth]);

  if (!authStrategy) {
    return <Loading />;
  }

  return (
    <LiveblocksProvider authEndpoint={authStrategy}>
      {children}
    </LiveblocksProvider>
  );
}

function AppLayout() {
  const location = useLocation()
  const isAuthPage = location.pathname === '/'

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {!isAuthPage && <Header />}
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
    <LiveblocksWrapper>
      <RoomProvider
        id={`formulation-${id}`}
        initialPresence={{ focusedId: null }}
        initialStorage={{
          formulation: new LiveObject({
            code: '', name: '', description: '', animal_group: '',
            shadowPrices: [], nutrientsMenu: [], ingredientsMenu: [],
            nutrientRatioConstraints: [],
          }),
          percentFormulation: new LiveObject({
            code: '',
            name: '',
            description: '',
            animal_group: '',
            cost: 0,
            weight: 0,
            ingredients: [], 
            nutrients: [],
            shadowPrices: []
          }),
        }}
      >
        <ClientSideSuspense fallback={<Loading />}>
          {() => <ViewFormulationEntry id={id} />}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksWrapper>
  )
}

function GroupFormulationRoom() {
  const { id } = useParams()
  return (
    <LiveblocksWrapper>
      <RoomProvider
        id={`formulation-${id}`}
        initialPresence={{ focusedId: null }}
        initialStorage={{
          formulation: new LiveObject({
            code: '', name: '', description: '', animal_group: '',
            shadowPrices: [], nutrientsMenu: [], ingredientsMenu: [],
            nutrientRatioConstraints: [],
          }),
        }}
      >
        <ClientSideSuspense fallback={<Loading />}>
          {() => <ViewGroupFormulationEntry id={id} />}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksWrapper>
  )
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Login /> },
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/ingredients', element: <Ingredients /> },
      { path: '/nutrients', element: <Nutrients /> },
      { path: '/formulations', element: <Formulations /> },
      { path: '/formulations/:id', element: <FormulationRoom /> },
      { path: '/groupFormulations/:id', element: <GroupFormulationRoom /> },
      { path: '/error', element: <ErrorPage /> },
    ],
  },
])

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>
  );
}

export default App;