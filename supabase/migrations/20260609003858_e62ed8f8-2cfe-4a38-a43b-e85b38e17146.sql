-- Coach feedback: restrict updates and deletes to the owner
CREATE POLICY "own coach_feedback update"
ON public.coach_feedback
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own coach_feedback delete"
ON public.coach_feedback
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Coach messages: restrict updates to the owner
CREATE POLICY "own coach_messages update"
ON public.coach_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);