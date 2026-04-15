import React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Button, CircularProgress,
} from '@mui/material'

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title || 'Confirm'}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message || 'Are you sure?'}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
