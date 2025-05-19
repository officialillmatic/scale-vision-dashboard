
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetellCall {
  call_id: string;
  contact_id: string;
  created_at: string;
  duration_sec: number;
  participants: {
    contact: {
      name: string;
      phone_number: string;
    };
    user: {
      name: string;
      phone_number: string;
    };
  };
  recording_url?: string;
  transcript?: string;
  state: "completed" | "in-progress" | "no-answer" | "voicemail" | "failed";
  disconnection_reason?: "hangup" | "timeout" | "error" | null;
  costs: {
    total_cost_usd: number;
  };
}

serve(async (req) => {
  try {
    // Handle preflight CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Extract auth token from headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get the variables we need from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const retellApiKey = Deno.env.get('RETELL_API_KEY');
    
    if (!supabaseUrl || !supabaseKey || !retellApiKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ error: 'Server configuration error', details: 'Missing required environment variables' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify the request comes from an authenticated user
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    // Get the company ID for this user
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .single();
      
    let companyId;
    
    if (companyError) {
      // Check if the user is a company member
      const { data: memberData, error: memberError } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (memberError || !memberData) {
        console.error("Failed to find company for user:", memberError);
        return new Response(
          JSON.stringify({ error: 'No company found for this user' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      companyId = memberData.company_id;
    } else {
      companyId = companyData.id;
    }
    
    // Fetch calls from Retell API
    const retellResponse = await fetch('https://api.retellai.com/v1/calls?limit=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${retellApiKey}`, 
        'Content-Type': 'application/json',
      },
    });
    
    if (!retellResponse.ok) {
      const errorText = await retellResponse.text();
      console.error("Retell API error:", retellResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Retell API error: ${retellResponse.status}`, details: errorText }),
        { status: retellResponse.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    const retellData = await retellResponse.json();
    
    if (!Array.isArray(retellData?.data)) {
      console.error("Unexpected response format from Retell API");
      return new Response(
        JSON.stringify({ error: 'Unexpected response format from Retell API' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    // Extract calls from response
    const calls = retellData.data as RetellCall[];
    
    // Process calls and download audio if available
    const processedCalls = [];
    
    for (const call of calls) {
      let localAudioUrl = null;
      
      // Download and store audio file if recording URL exists
      if (call.recording_url && call.state === "completed") {
        try {
          // Create safe filename based on call ID
          const audioFilename = `${companyId}/${call.call_id}.mp3`;
          
          // Check if we already have this recording stored
          const { data: existingFile } = await supabase
            .storage
            .from('recordings')
            .list(companyId, {
              search: call.call_id
            });
            
          if (!existingFile || existingFile.length === 0) {
            // Download the audio file
            console.log(`Downloading audio for call ${call.call_id}...`);
            const audioResponse = await fetch(call.recording_url);
            
            if (!audioResponse.ok) {
              console.error(`Failed to download audio for call ${call.call_id}`);
            } else {
              // Get audio content
              const audioBlob = await audioResponse.blob();
              
              // Upload to Supabase Storage
              const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('recordings')
                .upload(audioFilename, audioBlob, {
                  contentType: 'audio/mpeg',
                  upsert: true
                });
                
              if (uploadError) {
                console.error(`Failed to upload audio for call ${call.call_id}:`, uploadError);
              } else {
                console.log(`Successfully uploaded audio for call ${call.call_id}`);
                
                // Get public URL for the audio file
                const { data: urlData } = supabase
                  .storage
                  .from('recordings')
                  .getPublicUrl(audioFilename);
                  
                localAudioUrl = urlData.publicUrl;
              }
            }
          } else {
            console.log(`Audio file already exists for call ${call.call_id}`);
            
            // Get public URL for the existing audio file
            const { data: urlData } = supabase
              .storage
              .from('recordings')
              .getPublicUrl(audioFilename);
              
            localAudioUrl = urlData.publicUrl;
          }
        } catch (downloadError) {
          console.error(`Error processing audio for call ${call.call_id}:`, downloadError);
        }
      }
      
      // Prepare the call data for insertion
      processedCalls.push({
        call_id: call.call_id,
        timestamp: call.created_at,
        duration_sec: call.duration_sec,
        cost_usd: call.costs.total_cost_usd,
        user_id: user.id,
        company_id: companyId,
        sentiment: null, // Would come from analysis of transcript
        disconnection_reason: call.disconnection_reason || null,
        call_status: call.state,
        from: call.participants.user.phone_number,
        to: call.participants.contact.phone_number,
        audio_url: localAudioUrl || call.recording_url || null,
        transcript: call.transcript || null,
      });
    }
    
    // Insert calls into database
    const batchSize = 50;
    const results = [];
    let totalProcessed = 0;
    
    // Process in batches to avoid hitting limits
    for (let i = 0; i < processedCalls.length; i += batchSize) {
      const batch = processedCalls.slice(i, i + batchSize);
      
      // Use upsert to avoid duplicates
      const { data, error } = await supabase
        .from('calls')
        .upsert(batch, { 
          onConflict: 'call_id',
          ignoreDuplicates: false
        });
        
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
        results.push({ batch: i / batchSize + 1, success: false, error: error.message });
      } else {
        results.push({ batch: i / batchSize + 1, success: true, count: batch.length });
        totalProcessed += batch.length;
      }
    }
    
    // Return results
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${processedCalls.length} calls from Retell`,
        new_calls: processedCalls.length - totalProcessed,
        updated_calls: totalProcessed,
        results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
    
  } catch (error) {
    console.error("Unhandled exception:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
