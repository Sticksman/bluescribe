import _ from 'lodash'
import { Fragment, useState } from 'react'

import { useRoster, useRosterErrors, useConfirm, usePath } from '../Context'
import AddUnit from './AddUnit'
import Selection from './Selection'
import ListSelection from './ListSelection'
import { costString, sumCosts } from '../utils'
import { pathToForce } from '../validate'

const Force = () => {
  const [roster, setRoster] = useRoster()
  const [path, setPath] = usePath()
  const forcePath = pathToForce(path)
  const force = _.get(roster, forcePath)
  window.force = force
  const confirmDelete = useConfirm(true, `Delete ${force.name}?`)

  const [openSections, setOpenSections] = useState({})

  const errors = useRosterErrors()[forcePath]

  const selections = {}
  const parseSelection = (selection) => {
    const primary = _.find(selection.categories?.category, 'primary')?.entryId || '(No Category)'
    if (!primary) {
      debugger
    }
    selections[primary] = selections[primary] || []
    selections[primary].push(selection)
  }

  force.selections?.selection.forEach(parseSelection)

  const categories = force.categories.category.map((category) => {
    if (!selections[category.entryId]) {
      return null
    }
    const open = openSections[category.name] || openSections[category.name] === undefined

    return (
      <Fragment key={category.name}>
        <tr
          className="category"
          onClick={() =>
            setOpenSections({
              ...openSections,
              [category.name]: !open,
            })
          }
        >
          <th colSpan="3" open={open}>
            {category.name}
          </th>
        </tr>
        {open &&
          _.sortBy(selections[category.entryId], 'name').map((selection) => {
            return (
              <ListSelection
                key={selection.id}
                indent={1}
                selection={selection}
                selectionPath={`${forcePath}.selections.selection.${force.selections.selection.indexOf(selection)}`}
              />
            )
          })}
      </Fragment>
    )
  })

  const globalErrors = errors?.filter((e) => !e.includes('must have'))

  return (
    <section>
      <h6>
        {force.catalogueName}
        <small>{force.name}</small>
        <small>{costString(sumCosts(force))}</small>
        {errors && (
          <span className="errors" data-tooltip-id="tooltip" data-tooltip-html={errors.join('<br />')}>
            Validation errors
          </span>
        )}
        <span
          role="link"
          className="outline"
          onClick={() => {
            confirmDelete(() => {
              _.pull(roster.forces.force, force)
              setRoster(roster)
              setPath('')
            })
          }}
        >
          Remove
        </span>
      </h6>
      {!!globalErrors?.length && (
        <ul className="errors">
          {globalErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="grid columns">
        <div className="selections">
          <h6>Selections</h6>
          <table>
            <tbody>
              <tr onClick={() => setPath(forcePath)}>
                <th colSpan="3">Add Unit</th>
              </tr>
              {categories}
            </tbody>
          </table>
        </div>
        {path === forcePath ? <AddUnit errors={errors} /> : <Selection errors={errors} />}
      </div>
    </section>
  )
}

export default Force
