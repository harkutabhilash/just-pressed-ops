/**
 * Fetches location data for a given Indian pincode
 * @param {string|number} pincode - 6-digit Indian pincode
 * @returns {Promise<{city: string, state: string} | {error: string}>}
 */
export async function lookupPincode(pincode) {
  // Validate pincode format (6 digits)
  const pincodeStr = String(pincode).trim();

  if (!/^\d{6}$/.test(pincodeStr)) {
    return { error: 'Invalid pincode. Must be 6 digits.' };
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincodeStr}`);

    if (!response.ok) {
      return { error: `Network error: ${response.status} ${response.statusText}` };
    }

    const data = await response.json();

    // Check if API returned valid data
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { error: 'Invalid response from pincode API' };
    }

    const result = data[0];

    // Check for API-level errors
    if (result.Status !== 'Success' || !result.PostOffice || result.PostOffice.length === 0) {
      return { error: 'Pincode not found' };
    }

    // Extract city (District) and state from the first post office entry
    const postOffice = result.PostOffice[0];

    return {
      city: postOffice.District,
      state: postOffice.State
    };

  } catch (error) {
    // Handle network failures and other errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { error: 'Network failure. Please check your internet connection.' };
    }
    return { error: `Failed to fetch pincode data: ${error.message}` };
  }
}
