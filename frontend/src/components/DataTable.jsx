import React from 'react'
import {
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Tooltip, Typography, Box,
} from '@mui/material'
import { Edit, Delete, InboxOutlined } from '@mui/icons-material'

export default function DataTable({ columns, rows, onEdit, onDelete, emptyMessage = 'No records found' }) {
  if (!rows.length) {
    return (
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Box py={8} textAlign="center">
          <InboxOutlined sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="body1" color="text.secondary" fontWeight={500}>{emptyMessage}</Typography>
          <Typography variant="caption" color="text.disabled">Add your first record to get started</Typography>
        </Box>
      </Paper>
    )
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map(col => (
              <TableCell key={col.key}>{col.label}</TableCell>
            ))}
            {(onEdit || onDelete) && (
              <TableCell align="right">Actions</TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow
              key={row.id ?? i}
              hover
              sx={{ '&:last-child td': { border: 0 } }}
            >
              {columns.map(col => (
                <TableCell key={col.key} sx={{ py: 1.5 }}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </TableCell>
              ))}
              {(onEdit || onDelete) && (
                <TableCell align="right" sx={{ py: 1 }}>
                  <Box display="flex" justifyContent="flex-end" gap={0.5}>
                    {onEdit && (
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => onEdit(row)}
                          sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'primary.50' } }}
                        >
                          <Edit sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onDelete && (
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => onDelete(row)}
                          sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'error.50' } }}
                        >
                          <Delete sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
