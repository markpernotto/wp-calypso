/** @format */

/**
 * External dependencies
 */
import { pick } from 'lodash';

/**
 * Internal dependencies
 */
import { combineReducers, createReducer } from 'state/utils';
import {
	INVITES_REQUEST,
	INVITES_REQUEST_FAILURE,
	INVITES_REQUEST_SUCCESS,
	INVITE_RESEND_REQUEST,
	INVITE_RESEND_REQUEST_FAILURE,
	INVITE_RESEND_REQUEST_SUCCESS,
} from 'state/action-types';
import { inviteItemsSchema } from './schema';

/**
 * Returns the updated site invites requests state after an action has been
 * dispatched. The state reflects a mapping of site ID to a boolean reflecting
 * whether a request for the post is in progress.
 *
 * @param  {Object} state  Current state
 * @param  {Object} action Action payload
 * @return {Object}        Updated state
 */
export function requesting( state = {}, action ) {
	switch ( action.type ) {
		case INVITES_REQUEST:
		case INVITES_REQUEST_SUCCESS:
		case INVITES_REQUEST_FAILURE:
			return Object.assign( {}, state, {
				[ action.siteId ]: INVITES_REQUEST === action.type,
			} );
	}

	return state;
}

/**
 * Tracks all known invite objects as an object indexed by site ID and
 * containing arrays of invites.
 *
 * @param  {Object} state  Current state
 * @param  {Object} action Action payload
 * @return {Object}        Updated state
 */
export const items = createReducer(
	{},
	{
		[ INVITES_REQUEST_SUCCESS ]: ( state, action ) => {
			return {
				...state,
				[ action.siteId ]: action.invites.map( invite => {
					// Not renaming `avatar_URL` because it is used as-is by <Gravatar>
					const user = pick( invite.user, 'login', 'email', 'name', 'avatar_URL' );

					return {
						key: invite.invite_key,
						role: invite.role,
						isPending: invite.is_pending,
						user,
					};
				} ),
			};
		},
	},
	inviteItemsSchema
);

/**
 * Tracks the total number of invites the API says a given siteId has.
 * This count can be greater than the number of invites queried.
 *
 * @param  {Object} state  Current state
 * @param  {Object} action Action payload
 * @return {Object}        Updated state
 */
export const counts = createReducer(
	{},
	{
		[ INVITES_REQUEST_SUCCESS ]: ( state, action ) => {
			return {
				...state,
				[ action.siteId ]: action.found,
			};
		},
	}
);

/**
 * Returns the updated site invites resend requests state after an action has been
 * dispatched. The state reflects an object keyed by site ID, consisting of requested
 * resend invite IDs, with a boolean representing request status.
 *
 * @param  {Object} state  Current state
 * @param  {Object} action Action payload
 * @return {Object}        Updated state
 */
export function requestingResend( state = {}, action ) {
	switch ( action.type ) {
		case INVITE_RESEND_REQUEST:
		case INVITE_RESEND_REQUEST_SUCCESS:
		case INVITE_RESEND_REQUEST_FAILURE: {
			const isRequesting = INVITE_RESEND_REQUEST === action.type;
			const siteActions = Object.assign( {}, state[ action.siteId ], {
				[ action.inviteId ]: isRequesting,
			} );
			return Object.assign( {}, state, { [ action.siteId ]: siteActions } );
		}
	}

	return state;
}

export default combineReducers( { requesting, items, counts, requestingResend } );
