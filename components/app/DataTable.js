import EmptyState from './EmptyState'

const DataTable = ({
  columns,
  rows = [],
  getRowKey = row => row.id || row._id,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'Records will appear here as they are added.',
  caption,
}) => {
  if (!rows.length) return <EmptyState compact title={emptyTitle} description={emptyDescription} />

  return <div className='dataTable__scroll'>
    <table className='dataTable'>
      {caption && <caption>{caption}</caption>}
      <thead><tr>{columns.map(column => <th key={column.key} scope='col'>{column.label}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={getRowKey(row)}>
        {columns.map(column => <td key={column.key} data-label={column.label}>
          {column.render ? column.render(row) : row[column.key]}
        </td>)}
      </tr>)}</tbody>
    </table>
  </div>
}

export default DataTable
