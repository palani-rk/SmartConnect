import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Box, useTheme, useMediaQuery } from '@mui/material'

export const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleDrawerClose = () => {
    setMobileOpen(false)
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      {/* Header */}
      <Header onMenuClick={handleDrawerToggle} />
      
      <Box sx={{ display: 'flex' }}>
        {/* Sidebar */}
        <Sidebar 
          open={mobileOpen} 
          onClose={handleDrawerClose}
        />
        
        {/* Main Content */}
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: isMobile ? 2 : 3, // Less padding on mobile
            minHeight: 'calc(100vh - 80px)', // Account for header height
            width: isMobile ? '100%' : 'calc(100% - 256px)' // Full width on mobile
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}