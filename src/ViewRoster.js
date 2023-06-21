import React from 'react'
import { Fragment } from 'react'
import _ from 'lodash'
import useStorage from 'squirrel-gill'

import { useRoster, useSystem } from './Context'
import { costString, sumCosts } from './utils'
import Profiles, { collectSelectionProfiles } from './Force/Profiles'
import Rules, { collectRules } from './Force/Rules'
import Categories, { collectCategories } from './Force/Categories'
import PropTypes from 'prop-types'

const ViewRoster = () => {
  const [roster] = useRoster()
  const [type, setType] = useStorage(localStorage, 'viewRosterType', 'text')

      // <label>
      //   <input type="radio" checked={type === 'text'} onChange={() => setType('text')} />
      //   Text
      // </label>
      // <label>
      //   <input type="radio" checked={type === 'compact'} onChange={() => setType('compact')} />
      //   Compact
      // </label>
  return <>
    <fieldset>
      <span>View roster as</span>
      <label>
        <input type="radio" checked={type === 'full'} onChange={() => setType('full')} />
        Full
      </label>
    </fieldset>
    {type === 'text' && <code className="text-roster">
      +++ {roster.name} ({roster.gameSystemName}) [{costString(sumCosts(roster))}] +++
      {roster.forces?.force.map(force => {
        const selections = {}
        const parseSelection = selection => {
          const primary = _.find(selection.categories.category, 'primary').entryId
          selections[primary] = selections[primary] || []
          selections[primary].push(selection)
        }

        force.selections?.selection.forEach(parseSelection)

        return <Fragment key={force.id}>
          {'\n\n'}
          {'++ '}{force.name} ({force.catalogueName}) [{costString(sumCosts(force))}] ++
          {force.categories?.category.map(category => {
            if (!selections[category.entryId]) { return null }

            return <Fragment key={category.id}>
              {'\n\n'}
              {'  + '}{category.name} [{costString(sumCosts({selections: { selection: selections[category.entryId]}}))}] +
              {'\n\n'}
              {_.sortBy(selections[category.entryId], 'name').map(s => '    ' + viewSelectionText(s, 6)).join('\n\n')}
            </Fragment>
          })}
        </Fragment>
      })}
    </code>}
    {type === 'full' && <div className="view-roster">
      <h4>{roster.name} ({roster.gameSystemName}) [{costString(sumCosts(roster))}]</h4>
      {roster.forces?.force.map(force => <ViewForce force={force} key={force.id} />)}
    </div>}
  </>
}

const ViewForce = ({ force }) => {
  const gameData = useSystem()
  return <>
    <h5>{force.name} ({force.catalogueName}) [{costString(sumCosts(force))}]</h5>
    {force.selections?.selection.map(selection => <ViewSelection key={selection.id} selection={selection} catalogue={gameData.catalogues[force.catalogueId]} />)}
  </>
}
ViewForce.propTypes = {
  force: PropTypes.object.isRequired,
}

const ViewSelection = ({ catalogue, selection }) => {
  const gameData = useSystem()

  return <article>
    <header>
      <h6>{selection.name}</h6>
    </header>
    <Categories categories={collectCategories(selection, gameData, catalogue)} />
    <Profiles profiles={collectSelectionProfiles(selection, gameData)} number={selection.number} />
    <Rules catalogue={catalogue} rules={collectRules(selection)} />
  </article>
}
ViewSelection.propTypes = {
  catalogue: PropTypes.object.isRequired,
  selection: PropTypes.object.isRequired,
}

const viewSelectionText = (selection, indent) => {
  const cost = costString(sumCosts(selection))
  return [
    `${selection.name}${cost && ' [' + cost + ']'}`,
    ...(selection.selections?.selection.map(s => viewSelectionText(s, indent + 2)) || []),
  ].join('\n' + _.repeat(' ', indent))
}

export default ViewRoster
