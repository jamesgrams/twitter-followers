/**
 * List Twitter Followers for a user in order of follow count.
 * @author James Grams
 */

const axios = require("axios");
const minimist = require("minimist");
const fs = require("fs");
require('dotenv').config();

const SEPERATOR = "|";
const OUTPUT_FILE = "output.txt";
const BEARER_TOKEN = process.env.TWITTER_FOLLOWERS_BEARER;
const FOLLOWERS_API_URL = "https://api.twitter.com/1.1/followers/list.json?count=200&screen_name="
const ONE_MINUTE = 60 * 1000;
const TOO_MANY_REQUESTS = 429;

const ERROR_MESSAGES = {
    noUserSpecified: "No user specified"
}

/**
 * Main function.
 */
async function main() {
    let args = minimist(process.argv.slice(2));

    if( !args.user ) return Promise.reject(ERROR_MESSAGES.noUserSpecified);
    let followers = await fetchFollowers(args.user);
    followers = followers.sort( (a,b) => {
        if( a.followers > b.followers ) return -1;
        if( b.followers > a.followers ) return 1;
        return 0;
    } );
    followers.unshift( {
        name: "Name",
        username: "Username",
        location: "Location",
        followers: "Followers"
    } );
    let writeString = followers.map( el => Object.values(el).join(SEPERATOR) ).join("\n");
    fs.writeFileSync( OUTPUT_FILE, writeString );
}

/**
 * Fetch all followers for a user.
 * @param {string} user - The Twitter username for the user. 
 * @returns {Array<Object>} - An array of objects, each representing a follower.
 */
async function fetchFollowers(user) {
    let nextCursor = -1;
    let followers = [];
    while( nextCursor ) {
        let result;
        try {
            result = await axios.get( FOLLOWERS_API_URL + user + "&cursor=" + nextCursor, {
                headers: {
                    Authorization: "Bearer " + BEARER_TOKEN
                }
            } );
        }
        catch(err) {
            if( err.response.status === TOO_MANY_REQUESTS ) {
                console.log("Trying again in 1 minute");
                await delay(ONE_MINUTE);
                continue;
            }
            else {
                throw err;
            }
        }
        if( result && result.data ) {
            followers.push( ...result.data.users.map( el => {
                return {
                    name: el.name,
                    username: el.screen_name,
                    location: el.location,
                    followers: el.followers_count
                }
            } ));
            nextCursor = result.data.next_cursor;
        }
        else break;
    }
    return Promise.resolve(followers);
}

/**
 * Delay.
 * @param {number} ms - The number of milliseconds to delay. 
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

main();