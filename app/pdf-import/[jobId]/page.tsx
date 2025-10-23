import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CheckCircle } from 'lucide-react'

interface PageProps {
  params: { jobId: string }
}

export default async function PdfImportReviewPage({ params }: PageProps) {
  const supabase = await createClient()

  // Get the import job details
  const { data: job, error: jobError } = await supabase
    .from('pdf_import_jobs')
    .select('*')
    .eq('id', params.jobId)
    .single()

  if (jobError || !job) {
    notFound()
  }

  // Get all recipes from this import
  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select('*')
    .eq('pdf_import_job_id', params.jobId)
    .order('created_at', { ascending: true })

  if (recipesError) {
    console.error('Error fetching recipes:', recipesError)
  }

  const recipeList = recipes || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar recepten
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Import Voltooid
              </h1>
              <p className="text-gray-600">
                {job.recipes_imported} {job.recipes_imported === 1 ? 'recept' : 'recepten'} geïmporteerd uit{' '}
                <span className="font-medium">{job.filename}</span>
              </p>
              {job.completed_at && (
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(job.completed_at).toLocaleString('nl-NL', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="container mx-auto px-4 py-8">
        {recipeList.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Geen recepten gevonden voor deze import.</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Geïmporteerde Recepten ({recipeList.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Klik op een recept om details te bekijken
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recipeList.map((recipe) => (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.slug}`}
                  className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Recipe Image */}
                  <div className="relative aspect-[4/3] bg-gray-100">
                    {recipe.image_url ? (
                      <Image
                        src={recipe.image_url}
                        alt={recipe.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <svg
                          className="h-16 w-16"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Recipe Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
                      {recipe.title}
                    </h3>
                    {recipe.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {recipe.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                      {recipe.servings_default && (
                        <span>{recipe.servings_default} personen</span>
                      )}
                      {recipe.prep_time && (
                        <span>{recipe.prep_time} min prep</span>
                      )}
                      {recipe.pdf_source_pages && recipe.pdf_source_pages.length > 0 && (
                        <span>
                          p. {recipe.pdf_source_pages.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
