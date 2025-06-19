import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Box } from '@mui/material'

export const Layout = () => {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      {/* Header */}
      <Header />
      
      <Box sx={{ display: 'flex' }}>
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: 3 
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}