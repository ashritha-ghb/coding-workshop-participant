import React from 'react'
import {
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Tooltip, Typography, Box,
} from '@mui/material'
import { Edit, Delete } from '@mui/icons-material'

/**
 * Generic data table used across all list pages.
 * columns: [{ key, label, render? }]
 * rows: array of objects
 * onEdit / onDelete: optional callbacks — hidden when not provided
 */
export default function DataTable({ columns, rows, onEdit, onDelete, emptyMessage = 'No records found' }) {
  if (!rows.length) {
    return (
      <Box py={6} textAlign="center">
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    )
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            {columns.map(col => (
              <TableCell key={col.key} sx={{ fontWeight: 600 }}>{col.label}</TableCell>
            ))}
            {(onEdit || onDelete) && <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={row.id ?? i} hover>
              {columns.map(col => (
                <TableCell key={col.key}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </TableCell>
              ))}
              {(onEdit || onDelete) && (
                <TableCell align="right">
                  {onEdit && (
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => onEdit(row)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {onDelete && (
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
